import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  generateRandomString, 
  generateCodeChallenge, 
  DEEP_SSO_DOMAIN, 
  CLIENT_ID, 
  REDIRECT_URI 
} from '@/lib/auth/deep-id';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Guardrail: ensure client is configured
    const clientId = CLIENT_ID?.trim();
    if (!clientId || clientId.length < 6) {
      return NextResponse.redirect('/login?error=deepid_not_configured');
    }

    // 1. Generate PKCE params
    const state = generateRandomString();
    const nonce = generateRandomString();
    const codeVerifier = generateRandomString();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // 2. Store in short-lived cookies (HttpOnly, Secure, SameSite=Lax)
    const cookieStore = await cookies();
    const isSecure = process.env.NODE_ENV === 'production';
    
    // Helper to set cookie
    const setAuthCookie = (name: string, value: string) => {
      cookieStore.set(name, value, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 600, // 10 minutes
      });
    };

    setAuthCookie('deep_auth_state', state);
    setAuthCookie('deep_auth_nonce', nonce);
    setAuthCookie('deep_auth_code_verifier', codeVerifier);

    // 3. Determine redirect_uri (prefer dynamic origin in dev to avoid port mismatch)
    let redirectUri = REDIRECT_URI;
    if (process.env.NODE_ENV !== 'production') {
      try {
        const originFromReq = request.nextUrl.origin;
        if (originFromReq && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(originFromReq)) {
          redirectUri = `${originFromReq}/api/auth/deep-id/callback`;
        }
      } catch {}
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access',
      state: state,
      nonce: nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Deep-ID] Using redirect_uri:', redirectUri);
    }

    const authUrl = `${DEEP_SSO_DOMAIN}/oauth2/auth?${params.toString()}`;

    // 4. Redirect
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Deep ID Start Error:', error);
    return NextResponse.json({ error: 'Failed to initiate SSO' }, { status: 500 });
  }
}
