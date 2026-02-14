import fs from 'fs/promises';
import path from 'path';

type RegistrationResponse = {
  client_id: string;
  client_secret?: string;
  [key: string]: any;
};

async function main() {
  const domain = process.env.DEEP_SSO_DOMAIN?.trim() || 'https://identity.deep-id.ai';

  const prodOrigin = (process.env.APP_URL || 'https://reviewers-portal.vercel.app').replace(/\/$/, '');
  const localOrigin = (process.env.LOCAL_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  // Always include a robust set of local callbacks to avoid port/host mismatch in dev
  const devCandidates = Array.from(new Set([
    `${localOrigin}/api/auth/deep-id/callback`,
    `http://localhost:3000/api/auth/deep-id/callback`,
    `http://localhost:3001/api/auth/deep-id/callback`,
    `http://127.0.0.1:3000/api/auth/deep-id/callback`,
    `http://127.0.0.1:3001/api/auth/deep-id/callback`,
  ]));
  const prodCallback = `${prodOrigin}/api/auth/deep-id/callback`;

  const body = {
    client_name: 'reviewers-portal',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code', 'id_token'],
    scope: 'openid profile email offline_access',
    redirect_uris: [...devCandidates, prodCallback],
    token_endpoint_auth_method: 'client_secret_basic',
  };

  const url = `${domain}/oauth2/register`;
  console.log(`[Deep-ID] Registering confidential client at: ${url}`);
  console.log(`[Deep-ID] Redirect URIs:`);
  for (const u of body.redirect_uris) console.log(` - ${u}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: RegistrationResponse;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (status ${res.status}): ${text}`);
    }

    if (!res.ok) {
      throw new Error(`Registration failed: ${res.status} ${JSON.stringify(json)}`);
    }

    const clientId = json.client_id;
    const clientSecret = json.client_secret;

    if (!clientId) {
      throw new Error('Response missing client_id');
    }

    const output = {
      createdAt: new Date().toISOString(),
      domain,
      client_id: clientId,
      client_secret: clientSecret || null,
      redirect_uris: body.redirect_uris,
      token_endpoint_auth_method: body.token_endpoint_auth_method,
    };

    const outPath = path.resolve(process.cwd(), '.deepid-client.json');
    await fs.writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');

    console.log('\n[Deep-ID] Client registered successfully.');
    console.log(`client_id: ${clientId}`);
    if (clientSecret) console.log(`client_secret: ${clientSecret}`);
    console.log(`Saved to: ${outPath}`);
    console.log('\nNext steps:');
    console.log('1) Set DEEP_SSO_CLIENT_ID and DEEP_SSO_CLIENT_SECRET in your environment.');
    console.log('2) Restart your server for changes to take effect.');
  } catch (err: any) {
    console.error('[Deep-ID] Registration error:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
