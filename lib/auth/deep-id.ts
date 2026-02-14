import { createRemoteJWKSet, jwtVerify } from 'jose';
import crypto from 'crypto';

// Environment variables
export const DEEP_SSO_DOMAIN = process.env.DEEP_SSO_DOMAIN || 'https://identity.deep-id.ai';
export const CLIENT_ID = process.env.DEEP_SSO_CLIENT_ID || '';
const devOrigin = (process.env.LOCAL_APP_URL || '').replace(/\/$/, '');
const appOrigin = (process.env.APP_URL || 'https://reviewers-portal.vercel.app').replace(/\/$/, '');
const isProd = (process.env.VERCEL_ENV === 'production') || (process.env.NODE_ENV === 'production');
const origin = (!isProd && devOrigin) ? devOrigin : appOrigin;
export const REDIRECT_URI = `${origin}/api/auth/deep-id/callback`;

// Cache JWKS to avoid repeated fetches
const JWKS_URL = new URL(`${DEEP_SSO_DOMAIN}/.well-known/jwks.json`);
const JWKS = createRemoteJWKSet(JWKS_URL);

// OIDC Discovery Cache
let oidcConfigCache: { issuer: string } | null = null;

async function getOIDCConfiguration() {
  if (oidcConfigCache) return oidcConfigCache;
  
  try {
    const res = await fetch(`${DEEP_SSO_DOMAIN}/.well-known/openid-configuration`);
    if (res.ok) {
      const data = await res.json();
      oidcConfigCache = { issuer: data.issuer };
      return oidcConfigCache;
    }
  } catch (e) {
    console.warn('Failed to fetch OIDC configuration, using fallback', e);
  }
  
  return null;
}

/**
 * Generate a random string for state/nonce/verifier
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate PKCE Code Challenge from Verifier
 * S256 = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Verify ID Token
 */
export async function verifyIdToken(idToken: string, nonce: string) {
  try {
    const discovery = await getOIDCConfiguration();
    // Use discovery issuer if available, otherwise fallback
    const validIssuers = discovery?.issuer 
      ? [discovery.issuer] 
      : [`${DEEP_SSO_DOMAIN}/`, DEEP_SSO_DOMAIN];

    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: validIssuers, 
      audience: CLIENT_ID,
    });

    // Verify nonce matches
    if (payload.nonce !== nonce) {
      throw new Error('Invalid nonce in ID token');
    }

    return payload;
  } catch (error) {
    console.error('ID Token verification failed:', error);
    throw error;
  }
}

/**
 * Exchange Authorization Code for Tokens
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const tokenEndpoint = `${DEEP_SSO_DOMAIN}/oauth2/token`;
  const clientSecret = process.env.DEEP_SSO_CLIENT_SECRET || '';

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  // Basic Auth header
  const authHeader = `Basic ${Buffer.from(`${CLIENT_ID}:${clientSecret}`).toString('base64')}`;

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': authHeader,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch User Info using Access Token
 */
export async function fetchUserInfo(accessToken: string) {
  const userInfoEndpoint = `${DEEP_SSO_DOMAIN}/userinfo`;

  const response = await fetch(userInfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}
