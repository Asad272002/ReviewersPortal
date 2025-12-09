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

  // Fetch folder metadata
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${FOLDER_ID}?fields=id,name,mimeType,capabilities,owners,driveId,parents&supportsAllDrives=true`, {
    method: 'GET',
    headers,
  });
  if (!metaRes.ok) {
    const errText = await metaRes.text();
    console.error('Folder metadata fetch failed:', errText);
    process.exit(1);
  }
  const meta = await metaRes.json();
  console.log('Folder name:', meta.name);
  console.log('MimeType:', meta.mimeType);
  console.log('Drive ID:', meta.driveId || '(My Drive)');
  console.log('Capabilities:', meta.capabilities);

  // List permissions
  const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${FOLDER_ID}/permissions?supportsAllDrives=true`, {
    method: 'GET',
    headers,
  });
  if (!permRes.ok) {
    console.warn('Permissions list failed:', await permRes.text());
  } else {
    const perms = await permRes.json();
    console.log('Permissions count:', Array.isArray(perms.permissions) ? perms.permissions.length : 0);
  }

  // Try creating a temp doc to check write capability vs quota
  const title = `ACCESS TEST ${Date.now()}`;
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: title, mimeType: 'application/vnd.google-apps.document', parents: [FOLDER_ID] }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Create test doc failed:', errText);
    try {
      const err = JSON.parse(errText);
      const reason = err?.error?.errors?.[0]?.reason || '';
      const msg = err?.error?.message || '';
      if (reason === 'storageQuotaExceeded' || String(msg).toLowerCase().includes('quota')) {
        console.log('Conclusion: Service account has access, but Drive storage quota is exceeded.');
        process.exit(0);
      }
    } catch {}
    process.exit(1);
  } else {
    const doc = await createRes.json();
    console.log('Temp Doc created:', `https://docs.google.com/document/d/${doc.id}/edit`);
    // Cleanup
    await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?supportsAllDrives=true`, { method: 'DELETE', headers });
    console.log('Temp Doc deleted.');
  }
}

main().catch((e) => {
  console.error('Access check failed:', e.message || e);
  process.exit(1);
});
