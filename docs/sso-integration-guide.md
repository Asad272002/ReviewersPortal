# DEEP-SSO Integration Guide

## Overview

DEEP-SSO is a decentralized identity platform that enables your web applications to authenticate users via OAuth2/OIDC (OpenID Connect). This guide will walk you through integrating DEEP-SSO as your Single Sign-On (SSO) provider.

### What You'll Get

- **Decentralized Identity**: Users are identified by DIDs (Decentralized Identifiers) instead of email addresses
- **Multiple Authentication Methods**: Support for password, WebAuthn (passkeys), Ethereum wallet (SIWE), and Cardano wallet (CIP-8)
- **Standard OAuth2/OIDC**: Industry-standard authentication flow compatible with most OAuth2 libraries
- **Privacy-First**: Users control what data they share via consent screens
- **Secure Token Management**: Short-lived access tokens, refresh tokens, and ID tokens

### Architecture Overview

DEEP-SSO consists of the following components:

```
┌─────────────────┐
│   Your Web App  │
└────────┬────────┘
         │ (1) Redirect to authorize
         ↓
┌─────────────────────────────────────────┐
│  DEEP-SSO (Hydra Public Endpoint)      │
│  - Authorization endpoint               │
│  - Token endpoint                       │
│  - UserInfo endpoint                    │
└────────┬────────────────────────────────┘
         │ (2) User signs in & consents
         ↓
┌─────────────────────────────────────────┐
│  Login/Consent App                      │
│  - Kratos (Identity management)         │
│  - Profile Service (User data vault)    │
└─────────────────────────────────────────┘
```

**Key Endpoints:**
- **Authorization**: `https://{SSO_DOMAIN}/oauth2/auth` - Where users sign in
- **Token**: `https://{SSO_DOMAIN}/oauth2/token` - Exchange authorization code for tokens
- **UserInfo**: `https://{SSO_DOMAIN}/userinfo` - Retrieve user profile data
- **JWKS**: `https://{SSO_DOMAIN}/.well-known/jwks.json` - Public keys for token verification
- **Discovery**: `https://{SSO_DOMAIN}/.well-known/openid-configuration` - OIDC configuration

---

## Prerequisites

Before you begin, ensure you have:

1. **Contact DEEP-SSO Team**: Request access and receive your SSO domain (e.g., `https://identity.deep-id.ai`)
2. **Redirect URI**: Determine your application's callback URL (e.g., `https://yourapp.com/auth/callback`)
3. **OAuth2 Client Library**: Choose a library for your tech stack (see [Recommended Libraries](#recommended-libraries))
4. **HTTPS Certificate**: Your application must use HTTPS in production (required for OAuth2 security)

---

## Step 1: Register Your OAuth2 Client

You'll need to register your application with DEEP-SSO to obtain client credentials.

### Option A: Using the OAuth Client Manager Script (Recommended)

We provide a command-line tool to simplify client registration.

#### 1.1 Access the Script

Since DEEP-SSO is a private repository, you'll need to clone the repository to access the `oauth-client-manager.sh` script.

```bash
# Clone the DEEP-SSO repository
git clone git@github.com:your-org/DEEP-SSO.git
cd DEEP-SSO/scripts
chmod +x oauth-client-manager.sh
```


#### 1.2 Configure Environment Variables

Set the following environment variables before running the script:

```bash
# Required: Hydra public endpoint URL (provided by DEEP-SSO team)
export HYDRA_SERVICE_URL="https://identity.deep-id.ai"

# Required: Your application's callback URL
export DEFAULT_REDIRECT_URI="https://yourapp.com/auth/callback"
```

#### 1.3 Create Your OAuth2 Client

**For Public Clients (SPAs, Mobile Apps):**

Public clients cannot securely store client secrets. Use this for:
- Single Page Applications (React, Vue, Angular)
- Mobile applications (iOS, Android)
- Desktop applications

```bash
./oauth-client-manager.sh create "My App Name" public "https://yourapp.com/auth/callback"
```

**For Confidential Clients (Backend Web Apps):**

Confidential clients can securely store client secrets. Use this for:
- Server-side web applications (Node.js, Python, Java, .NET)
- Backend services with secure credential storage

```bash
./oauth-client-manager.sh create "My App Name" confidential "https://yourapp.com/auth/callback"
```

**Multiple Redirect URIs:**

If your app has multiple callback URLs (e.g., dev, staging, production):

```bash
./oauth-client-manager.sh create "My App Name" confidential \
  "https://localhost:3000/callback,https://staging.yourapp.com/callback,https://yourapp.com/callback"
```

#### 1.4 Save Your Credentials

The script will output your credentials:

```
✓ Client created successfully!

ℹ Client ID: abc123def456ghi789
ℹ Client Secret: secret_xyz789abc123  # (only for confidential clients)
✓ Credentials saved to: ./oauth-clients/My-App-Name.json
```

**⚠️ IMPORTANT:**
- Store `client_id` and `client_secret` (if applicable) securely
- Never commit client secrets to version control
- Use environment variables or secret management systems
- The credentials are also saved locally in `./oauth-clients/` directory

### Option B: Manual Registration via API

If you prefer API-based registration:

```bash
curl -X POST "https://identity.deep-id.ai/oauth2/register" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My App Name",
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code", "id_token"],
    "scope": "openid profile email offline_access",
    "redirect_uris": ["https://yourapp.com/auth/callback"],
    "token_endpoint_auth_method": "client_secret_basic"
  }'
```

For public clients, use `"token_endpoint_auth_method": "none"`.

---

## Step 2: Understanding the OAuth2 Flow

DEEP-SSO uses the **Authorization Code Flow with PKCE** (Proof Key for Code Exchange), which is the most secure OAuth2 flow.

### Flow Diagram

The OAuth2 Authorization Code Flow with PKCE involves three parties:

```
┌──────────────────┐
│  Resource Owner  │
│     (User)       │
└────────┬─────────┘
         │
         │ (1) Initiates login
         ↓
┌─────────────────────────────────┐              ┌──────────────────────────────┐
│          Client                 │              │   Authorization Server       │
│        (Your App)               │              │   identity.deep-id.ai        │
│                                 │              │   (Hydra + Login/Consent)    │
│  ┌─────────────────────────┐   │              │                              │
│  │ 1. Generate PKCE params │   │              │                              │
│  │    - code_verifier      │   │              │                              │
│  │    - code_challenge     │   │              │                              │
│  └─────────────────────────┘   │              │                              │
│                                 │              │                              │
│  (2) Redirect to /oauth2/auth   │              │                              │
│      + client_id                ├─────────────►│                              │
│      + redirect_uri             │              │                              │
│      + code_challenge           │              │                              │
│      + state, nonce             │              │                              │
│                                 │              │                              │
│                                 │              │  (3) Present login UI        │
│                                 │              │  (4) User authenticates      │
│                                 │              │  (5) User grants consent     │
│                                 │              │                              │
│  (6) Receive authorization code │              │                              │
│      via redirect to callback   │◄─────────────┤  Redirect with code          │
│      ?code=ABC123&state=...     │              │                              │
│                                 │              │                              │
│  ┌─────────────────────────┐   │              │                              │
│  │ 7. Exchange code for    │   │              │                              │
│  │    tokens               │   │              │                              │
│  └─────────────────────────┘   │              │                              │
│                                 │              │                              │
│  POST /oauth2/token             │              │                              │
│    + code                       ├─────────────►│                              │
│    + code_verifier              │              │  Verify PKCE                 │
│    + client credentials         │              │  Validate code               │
│                                 │              │                              │
│  (8) Receive tokens             │              │                              │
│    - access_token               │◄─────────────┤                              │
│    - id_token (JWT)             │              │                              │
│    - refresh_token              │              │                              │
│                                 │              │                              │
│  ┌─────────────────────────┐   │              │                              │
│  │ 9. Request user profile │   │              │                              │
│  └─────────────────────────┘   │              │                              │
│                                 │              │                              │
│  GET /userinfo                  │              │                              │
│    Authorization: Bearer TOKEN  ├─────────────►│                              │
│                                 │              │  Validate access_token       │
│                                 │              │                              │
│  (10) Receive user data         │              │                              │
│      {sub, name, email, ...}    │◄─────────────┤                              │
│                                 │              │                              │
│  ┌─────────────────────────┐   │              │                              │
│  │ 11. Create session      │   │              │                              │
│  │     User is logged in   │   │              │                              │
│  └─────────────────────────┘   │              │                              │
└─────────────────────────────────┘              └──────────────────────────────┘
```

**Key Steps Explained:**

- **Steps 1-2 (Client)**: Your app generates PKCE parameters and redirects the user's browser to the authorization server
- **Steps 3-5 (Authorization Server)**: User authenticates (password/wallet/WebAuthn) and grants consent
- **Step 6 (Authorization Server → Client)**: User is redirected back to your app with an authorization code
- **Steps 7-8 (Client ↔ Authorization Server)**: Your backend exchanges the code for tokens (server-to-server)
- **Steps 9-10 (Client ↔ Authorization Server)**: Your backend fetches user profile data using the access token
- **Step 11 (Client)**: Your app creates a session and the user is logged in


**Authorization Code**: A temporary code issued after user login, exchanged for tokens.

**PKCE (Proof Key for Code Exchange)**: Security enhancement that prevents authorization code interception attacks.
- `code_verifier`: Random string generated by your app
- `code_challenge`: SHA-256 hash of the code_verifier

**Tokens**:
- **Access Token**: Short-lived token (typically 1 hour) used to access protected resources
- **ID Token**: JWT containing user identity information (name, DID, email, etc.)
- **Refresh Token**: Long-lived token used to obtain new access tokens without re-authentication

**Scopes**: Permissions requested from the user
- `openid`: Required for OIDC, provides user's DID
- `profile`: Basic profile information (name, avatar)
- `email`: Email address
- `offline_access`: Grants refresh token for offline access

---

## Step 3: Implement the Authorization Flow

### 3.1 Generate PKCE Parameters

Before redirecting users to the authorization endpoint, generate PKCE parameters:

**JavaScript/TypeScript:**
```javascript
// Generate random code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate code challenge from verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Usage
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Store codeVerifier in session/localStorage for later use
sessionStorage.setItem('pkce_code_verifier', codeVerifier);
```

**Python:**
```python
import secrets
import hashlib
import base64

def generate_code_verifier():
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')

def generate_code_challenge(verifier):
    digest = hashlib.sha256(verifier.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')

# Usage
code_verifier = generate_code_verifier()
code_challenge = generate_code_challenge(code_verifier)

# Store code_verifier in server session for later use
session['pkce_code_verifier'] = code_verifier
```

**Node.js:**
```javascript
const crypto = require('crypto');

function generateCodeVerifier() {
  return crypto.randomBytes(32)
    .toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

// Usage
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// Store code_verifier in server session
req.session.pkce_code_verifier = codeVerifier;
```

### 3.2 Redirect to Authorization Endpoint

Build the authorization URL and redirect the user:

```javascript
const authParams = new URLSearchParams({
  response_type: 'code',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'https://yourapp.com/auth/callback',
  scope: 'openid profile email offline_access',
  state: generateRandomState(), // CSRF protection
  nonce: generateRandomNonce(), // Replay attack protection
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});

const authUrl = `https://identity.deep-id.ai/oauth2/auth?${authParams}`;

// Redirect user to authorization URL
window.location.href = authUrl;
// Or for server-side: res.redirect(authUrl);
```

**Important Parameters:**
- `state`: Random string to prevent CSRF attacks (verify it matches on callback)
- `nonce`: Random value to prevent replay attacks (included in ID token)
- `code_challenge_method`: Always use `S256` for SHA-256 hashing

### 3.3 Handle the Callback

After user authentication and consent, DEEP-SSO redirects back to your callback URL:

```
https://yourapp.com/auth/callback?code=AUTH_CODE&state=STATE_VALUE
```

**Callback Handler Example (Node.js/Express):**
```javascript
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 1. Verify state parameter (CSRF protection)
  if (state !== req.session.oauth_state) {
    return res.status(400).send('Invalid state parameter');
  }
  
  // 2. Exchange authorization code for tokens
  const codeVerifier = req.session.pkce_code_verifier;
  
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'https://yourapp.com/auth/callback',
    code_verifier: codeVerifier
  });
  
  const tokenResponse = await fetch('https://identity.deep-id.ai/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // For confidential clients, add Basic Auth header:
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    },
    body: tokenParams
  });
  
  const tokens = await tokenResponse.json();
  
  // 3. Store tokens securely
  req.session.access_token = tokens.access_token;
  req.session.refresh_token = tokens.refresh_token;
  req.session.id_token = tokens.id_token;
  
  // 4. Get user info
  const userInfoResponse = await fetch('https://identity.deep-id.ai/userinfo', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  });
  
  const userInfo = await userInfoResponse.json();
  req.session.user = userInfo;
  
  // 5. Redirect to your app's dashboard
  res.redirect('/dashboard');
});
```

**For Public Clients** (no client secret):
```javascript
// Omit Authorization header and include client_id in body
const tokenParams = new URLSearchParams({
  grant_type: 'authorization_code',
  code: code,
  redirect_uri: 'https://yourapp.com/auth/callback',
  code_verifier: codeVerifier,
  client_id: CLIENT_ID  // Add client_id for public clients
});
```

### 3.4 Parse the ID Token

The ID token is a JWT containing user identity information. You can decode it to extract user details:

**JavaScript/TypeScript:**
```javascript
// Install: npm install jsonwebtoken
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Create JWKS client to fetch public keys
const client = jwksClient({
  jwksUri: 'https://identity.deep-id.ai/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify and decode ID token
jwt.verify(idToken, getKey, {
  algorithms: ['RS256'],
  issuer: 'https://identity.deep-id.ai',
  audience: CLIENT_ID
}, (err, decoded) => {
  if (err) {
    console.error('Invalid token:', err);
    return;
  }
  
  console.log('User DID:', decoded.sub);
  console.log('Auth methods:', decoded.amr); // e.g., ["pwd"], ["siwe"], ["cip8"]
  console.log('Token issued at:', new Date(decoded.iat * 1000));
  console.log('Token expires at:', new Date(decoded.exp * 1000));
});
```

**ID Token Structure:**
```json
{
  "sub": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "aud": "your-client-id",
  "iss": "https://identity.deep-id.ai",
  "iat": 1638360000,
  "exp": 1638363600,
  "nonce": "abc123nonce456",
  "amr": ["pwd"],
  "at_hash": "x7w...",
  "email": "user@example.com",
  "email_verified": true
}
```

---

## Step 4: Access Protected Resources

### 4.1 Call UserInfo Endpoint

Get the user's profile information:

```javascript
const userInfoResponse = await fetch('https://identity.deep-id.ai/userinfo', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const userInfo = await userInfoResponse.json();

console.log(userInfo);
// {
//   "sub": "did:key:z6Mk...",
//   "name": "John Doe",
//   "email": "john@example.com",
//   "email_verified": true,
//   "picture": "https://cdn.deep-id.ai/avatars/...",
//   "wallet_addresses": ["0x1234...", "addr1..."],
//   "kyc_verified": true
// }
```

**Available Claims** (based on granted scopes):
- `sub`: User's DID (always included with `openid` scope)
- `name`, `given_name`, `family_name`, `picture`: User profile data (`profile` scope)
- `email`, `email_verified`: Email address (`email` scope)
- `wallet_addresses`: Linked blockchain wallets (custom scope)
- `kyc_verified`: KYC verification status (custom scope `kyc.read`)

### 4.2 Token Refresh

Access tokens expire after ~1 hour. Use the refresh token to obtain new tokens without re-authentication:

```javascript
async function refreshAccessToken(refreshToken) {
  const tokenParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  
  const response = await fetch('https://identity.deep-id.ai/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    },
    body: tokenParams
  });
  
  const tokens = await response.json();
  return tokens; // { access_token, id_token, expires_in }
}
```

**Best Practice**: Implement automatic token refresh before expiration:
```javascript
// Check if token will expire in next 5 minutes
if (tokenExpiresAt - Date.now() < 5 * 60 * 1000) {
  const newTokens = await refreshAccessToken(refreshToken);
  // Update stored tokens
}
```

---

## Step 5: Testing Your Integration

### 5.1 Test the Complete Flow

Use the provided script to test your OAuth2 flow:

```bash
# Start the authorization flow
./oauth-client-manager.sh start-auth-flow YOUR_CLIENT_ID "https://yourapp.com/auth/callback"

# This will:
# 1. Generate PKCE parameters
# 2. Build the authorization URL
# 3. Open your browser to the login page
# 4. Display the authorization URL for manual testing
```

### 5.2 Exchange Authorization Code

After completing the login flow, you'll be redirected with a code:

```bash
# Exchange the authorization code for tokens
./oauth-client-manager.sh exchange-token YOUR_CLIENT_ID AUTH_CODE_HERE
```

### 5.3 Get User Info

```bash
# Retrieve user information using the access token
./oauth-client-manager.sh userinfo YOUR_CLIENT_ID ACCESS_TOKEN_HERE
```

### 5.4 List Your Registered Clients

```bash
# View all locally registered clients
./oauth-client-manager.sh list
```

---

## Recommended Libraries

Choose an OAuth2 library for your technology stack:

### JavaScript/TypeScript
- **[next-auth](https://next-auth.js.org/)** (Next.js)
- **[passport-oauth2](https://www.passportjs.org/packages/passport-oauth2/)** (Node.js/Express)
- **[@auth0/auth0-spa-js](https://github.com/auth0/auth0-spa-js)** (SPAs - configure for custom OIDC provider)
- **[oidc-client-ts](https://github.com/authts/oidc-client-ts)** (TypeScript OIDC client)

### Python
- **[Authlib](https://authlib.org/)** - OAuth2/OIDC client and server
- **[python-jose](https://python-jose.readthedocs.io/)** - JWT verification

### Java
- **[Spring Security OAuth2](https://spring.io/projects/spring-security-oauth)**
- **[Nimbus OAuth 2.0 SDK](https://connect2id.com/products/nimbus-oauth-openid-connect-sdk)**

### .NET
- **[Microsoft.AspNetCore.Authentication.OpenIdConnect](https://docs.microsoft.com/en-us/aspnet/core/security/authentication/oidc)**

### Go
- **[golang.org/x/oauth2](https://pkg.go.dev/golang.org/x/oauth2)**
- **[coreos/go-oidc](https://github.com/coreos/go-oidc)**

---

## Security Best Practices

### 1. Always Use HTTPS
- OAuth2 requires HTTPS for all redirect URIs in production
- Never use `http://` in production environments

### 2. Validate State Parameter
- Always verify the `state` parameter matches what you sent
- Prevents CSRF (Cross-Site Request Forgery) attacks

### 3. Use PKCE for All Clients
- PKCE is required for public clients (SPAs, mobile apps)
- Also recommended for confidential clients as defense-in-depth

### 4. Secure Token Storage
- **Backend apps**: Store tokens in encrypted server-side sessions
- **SPAs**: Use `httpOnly` cookies or secure session storage
- **Never** store tokens in localStorage if possible (vulnerable to XSS)

### 5. Validate ID Tokens
- Always verify the JWT signature using JWKS endpoint
- Check `iss` (issuer), `aud` (audience), and `exp` (expiration)
- Verify `nonce` matches the value you sent

### 6. Short-Lived Access Tokens
- Access tokens expire after 1 hour
- Implement automatic refresh before expiration
- Never store refresh tokens client-side in SPAs

### 7. Rotate Client Secrets
- Rotate client secrets periodically (recommended: every 90 days)
- Use secret management systems (e.g., AWS Secrets Manager, HashiCorp Vault)

### 8. Minimal Scope Requests
- Only request scopes your application needs
- Users can see and deny specific scopes

---

## Troubleshooting

### Common Error Messages

#### `invalid_client`
**Cause**: Client authentication failed
- **Solution**: Verify `client_id` and `client_secret` are correct
- For confidential clients, ensure Basic Auth header is properly formatted

#### `invalid_grant`
**Cause**: Authorization code is invalid or expired
- **Solution**: Authorization codes are single-use and expire after 10 minutes
- Ensure you're not reusing the same code
- Check that `redirect_uri` matches the one used in authorization request

#### `invalid_request - code_verifier missing`
**Cause**: PKCE code_verifier not provided
- **Solution**: Include `code_verifier` parameter in token exchange request

#### `unauthorized_client`
**Cause**: Client is not authorized for this grant type or scope
- **Solution**: Verify your client is configured with `authorization_code` grant type
- Check requested scopes are allowed for your client

#### `access_denied`
**Cause**: User denied consent or authorization
- **Solution**: User chose not to grant permissions
- Provide clear explanation of why your app needs these permissions

### Debug Checklist

1. ✅ Is `HYDRA_SERVICE_URL` set correctly?
2. ✅ Does your `redirect_uri` exactly match the registered URI?
3. ✅ Are you using HTTPS for redirect URIs in production?
4. ✅ Is the `code_verifier` correctly generated and stored?
5. ✅ Are you including all required parameters in requests?
6. ✅ Is the authorization code being exchanged within 10 minutes?
7. ✅ For confidential clients, is the `client_secret` correct?

### Getting Help

If you encounter issues:

1. **Check Logs**: Review your application logs for detailed error messages
2. **Test with Script**: Use `oauth-client-manager.sh` to isolate the problem
3. **Verify Configuration**: Run `curl https://identity.deep-id.ai/.well-known/openid-configuration` to verify endpoint URLs


---

## Advanced Topics

### Custom Scopes

Beyond standard OIDC scopes, DEEP-SSO supports custom scopes:

- `kyc.read`: Access to KYC verification status
- `wallet.read`: Access to linked blockchain wallet addresses
- `profile.full`: Extended profile information

Request custom scopes in the `scope` parameter:
```javascript
scope: 'openid profile email wallet.read kyc.read'
```

### Token Introspection

For backend services, validate access tokens server-side:

```bash
curl -X POST "https://identity.deep-id.ai/oauth2/introspect" \
  -u "${CLIENT_ID}:${CLIENT_SECRET}" \
  -d "token=${ACCESS_TOKEN}"
```

Response:
```json
{
  "active": true,
  "sub": "did:key:z6Mk...",
  "scope": "openid profile email",
  "exp": 1638363600,
  "iat": 1638360000,
  "client_id": "your-client-id"
}
```

### Logout

To log users out of DEEP-SSO (not just your app):

```javascript
// Redirect to logout endpoint
const logoutUrl = `https://identity.deep-id.ai/oauth2/sessions/logout?post_logout_redirect_uri=${encodeURIComponent('https://yourapp.com')}`;
window.location.href = logoutUrl;
```

---

## Example Implementation

Here's a complete minimal example using Express.js:

```javascript
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

const app = express();

// Configuration
const config = {
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/auth/callback',
  authorizationUrl: 'https://identity.deep-id.ai/oauth2/auth',
  tokenUrl: 'https://identity.deep-id.ai/oauth2/token',
  userInfoUrl: 'https://identity.deep-id.ai/userinfo'
};

app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true
}));

// Helper: Generate PKCE parameters
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Route: Login
app.get('/login', (req, res) => {
  const pkce = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store in session
  req.session.pkce_verifier = pkce.verifier;
  req.session.oauth_state = state;
  
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid profile email offline_access',
    state: state,
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256'
  });
  
  res.redirect(`${config.authorizationUrl}?${authParams}`);
});

// Route: Callback
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Verify state
  if (state !== req.session.oauth_state) {
    return res.status(400).send('Invalid state');
  }
  
  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    code_verifier: req.session.pkce_verifier
  });
  
  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
    },
    body: tokenParams
  });
  
  const tokens = await tokenResponse.json();
  
  // Get user info
  const userInfoResponse = await fetch(config.userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  });
  
  const userInfo = await userInfoResponse.json();
  
  // Store in session
  req.session.user = userInfo;
  req.session.tokens = tokens;
  
  res.redirect('/dashboard');
});

// Route: Dashboard (protected)
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.send(`
    <h1>Welcome, ${req.session.user.name || req.session.user.sub}</h1>
    <p>DID: ${req.session.user.sub}</p>
    <p>Email: ${req.session.user.email || 'Not provided'}</p>
    <a href="/logout">Logout</a>
  `);
});

// Route: Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(3000, () => {
  console.log('App running on http://localhost:3000');
});
```

---

## Appendix

### A. OIDC Discovery Document

Retrieve all endpoint URLs dynamically:

```bash
curl https://identity.deep-id.ai/.well-known/openid-configuration | jq
```

### B. Supported Grant Types

- `authorization_code`: Standard OAuth2 flow (recommended)
- `refresh_token`: Refresh access tokens

### C. Supported Response Types

- `code`: Authorization code
- `id_token`: ID token only (implicit flow, not recommended)

### D. Supported Token Auth Methods

- `client_secret_basic`: HTTP Basic authentication (confidential clients)
- `client_secret_post`: Client secret in POST body (confidential clients)
- `none`: No authentication (public clients)

### E. Algorithm Support

- **ID Token Signing**: RS256 (RSA with SHA-256)
- **Token Endpoint Auth**: client_secret_basic, client_secret_post



---


