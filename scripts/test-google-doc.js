const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1PCRqTGuA3P3MNFaVimUy4Fo-kiyjT5AO';
const CLIENT_PATH = process.env.GDRIVE_OAUTH_PATH || path.join(process.cwd(), 'supabase', 'gdrive-oauth-client.json');
const TOKEN_PATH = process.env.GDRIVE_CREDENTIALS_PATH || path.join(process.cwd(), 'supabase', 'gdrive-oauth-token.json');

function getClientCreds(clientJson) {
  if (!clientJson) return { client_id: '', client_secret: '' };
  if (clientJson.client_id && clientJson.client_secret) return clientJson;
  if (clientJson.installed && clientJson.installed.client_id) return { client_id: clientJson.installed.client_id, client_secret: clientJson.installed.client_secret };
  if (clientJson.web && clientJson.web.client_id) return { client_id: clientJson.web.client_id, client_secret: clientJson.web.client_secret };
  return { client_id: '', client_secret: '' };
}

async function getAccessToken() {
  const clientRaw = fs.readFileSync(CLIENT_PATH, 'utf-8');
  const tokenRaw = fs.readFileSync(TOKEN_PATH, 'utf-8');
  const clientJson = JSON.parse(clientRaw);
  const tokenJson = JSON.parse(tokenRaw);
  const { client_id, client_secret } = getClientCreds(clientJson);
  const refresh_token = String(tokenJson.refresh_token || '');
  const body = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token,
    grant_type: 'refresh_token',
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await tokenRes.json();
  const accessToken = String(json.access_token || '');
  if (!accessToken) throw new Error('Failed to acquire OAuth access token');
  return accessToken;
}

async function main() {
  const accessToken = await getAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const title = `TEST Milestone Report ${Date.now()}`;
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: title, mimeType: 'application/vnd.google-apps.document', parents: [FOLDER_ID] }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Drive file create failed: ${errText}`);
  }
  const createJson = await createRes.json();
  const documentId = String(createJson.id || '');
  if (!documentId) throw new Error('No documentId returned');

  const text = `Automated test document created at ${new Date().toISOString()}`;
  const insertRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests: [ { insertText: { location: { index: 1 }, text } } ] }),
  });
  if (!insertRes.ok) throw new Error(`Docs insert failed: ${await insertRes.text()}`);

  const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!permRes.ok) throw new Error(`Set permission failed: ${await permRes.text()}`);

  const url = `https://docs.google.com/document/d/${documentId}/edit`;
  console.log('Document created:', url);
}

main().catch((e) => {
  console.error('Test failed:', e.message || e);
  process.exit(1);
});
