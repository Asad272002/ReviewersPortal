import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { 
  exchangeCodeForTokens, 
  verifyIdToken, 
  REDIRECT_URI 
} from '@/lib/auth/deep-id';
import { supabaseService } from '@/lib/supabase/service';
import { User } from '@/types/auth';

export const dynamic = 'force-dynamic';

function logSSOError(type: string, message: string, details?: any) {
  // Ensure no secrets are logged
  console.error(`[SSO Error] Type: ${type}, Message: ${message}`, details ? JSON.stringify(details) : '');
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Helper to clear SSO cookies on any response
  const clearSSOCookies = (res: NextResponse) => {
    const options = {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const
    };
    res.cookies.set('deep_auth_state', '', options);
    res.cookies.set('deep_auth_nonce', '', options);
    res.cookies.set('deep_auth_code_verifier', '', options);
    return res;
  };

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle SSO provider errors
    if (error) {
      logSSOError('provider_error', error);
      return clearSSOCookies(NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url)));
    }

    if (!code || !state) {
      logSSOError('missing_code', 'Code or state missing');
      return clearSSOCookies(NextResponse.redirect(new URL('/login?error=missing_params', request.url)));
    }

    const storedState = cookieStore.get('deep_auth_state')?.value;
    const storedNonce = cookieStore.get('deep_auth_nonce')?.value;
    const codeVerifier = cookieStore.get('deep_auth_code_verifier')?.value;

    // Validate state (CSRF protection)
    if (!storedState || state !== storedState) {
      logSSOError('invalid_state', 'State mismatch or missing');
      return clearSSOCookies(NextResponse.redirect(new URL('/login?error=invalid_state', request.url)));
    }

    if (!codeVerifier) {
      logSSOError('missing_verifier', 'Code verifier missing');
      return clearSSOCookies(NextResponse.redirect(new URL('/login?error=missing_verifier', request.url)));
    }

    // Exchange code for tokens
    let tokenResponse;
    try {
      tokenResponse = await exchangeCodeForTokens(code, codeVerifier);
    } catch (e: any) {
       logSSOError('token_exchange_failed', e.message);
       // We catch and rethrow or handle here. If we rethrow, the outer catch handles it.
       // But we want to ensure we log the specific type.
       throw e; 
    }
    
    // Verify ID Token
    const idToken = tokenResponse.id_token;
    if (!idToken || !storedNonce) {
       logSSOError('id_token_verify_failed', 'ID token or nonce missing');
       throw new Error('Missing ID token or nonce');
    }
    
    let claims;
    try {
      claims = await verifyIdToken(idToken, storedNonce);
    } catch (e: any) {
      logSSOError('id_token_verify_failed', e.message);
      throw e;
    }

    const did = claims.sub; // DID is in 'sub'

    if (!did) {
      logSSOError('missing_did', 'No DID in token');
      throw new Error('No DID in token');
    }

    // Lookup user by DID
    const user = await supabaseService.getUserByDeepDid(did);

    if (!user) {
      logSSOError('not_linked', `DID ${did} not linked to any user`);
      // Redirect to login with error if account not found
      // We do NOT auto-create accounts
      const url = new URL('/login', request.url);
      url.searchParams.set('error', 'account_not_linked');
      url.searchParams.set('details', `did:${did}`);
      return clearSSOCookies(NextResponse.redirect(url));
    }

    // Normalize role (match existing logic)
    const roleLower = String(user.role || '').toLowerCase().replace(/\s+/g, '_');
    const normalizedRole = roleLower === 'admin' ? 'admin' : 
                          roleLower === 'team_leader' ? 'team' : 
                          roleLower === 'team' ? 'team' : 
                          roleLower === 'partner' ? 'partner' : 'reviewer';

    // Issue Portal JWT
    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    
    const token = await new SignJWT({ 
      userId: user.id,
      username: user.username,
      name: user.name,
      role: normalizedRole 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Redirect based on role
    const redirectUrl = normalizedRole === 'partner' ? '/partner-dashboard' : '/';
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set auth cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return clearSSOCookies(response);

  } catch (err: any) {
    // If it's not one of our specific logs, log it here
    console.error('SSO Callback Unhandled Error:', err);
    return clearSSOCookies(NextResponse.redirect(new URL(`/login?error=sso_failed&details=${encodeURIComponent(err.message)}`, request.url)));
  }
}
