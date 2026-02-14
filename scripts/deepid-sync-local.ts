import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

function parseEnv(content: string) {
  const lines = content.split(/\r?\n/);
  const entries: { key?: string; raw: string }[] = lines.map((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) return { key: m[1], raw: line };
    return { raw: line };
  });
  return entries;
}

function serializeEnv(entries: { key?: string; raw: string }[]) {
  return entries.map((e) => e.raw).join('\n');
}

async function main() {
  const root = process.cwd();
  const clientPath = path.join(root, '.deepid-client.json');
  const envPath = path.join(root, '.env.local');

  if (!fs.existsSync(clientPath)) {
    console.error('.deepid-client.json not found. Run npm run deepid:register first.');
    process.exit(1);
  }
  const rawClient = await fsp.readFile(clientPath, 'utf8');
  const client = JSON.parse(rawClient);
  const domain = String(client.domain || '').trim() || 'https://identity.deep-id.ai';
  const clientId = String(client.client_id || '').trim();
  const clientSecret = String(client.client_secret || '').trim();

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = await fsp.readFile(envPath, 'utf8');
  }
  const entries = parseEnv(envContent);

  // Remove all existing occurrences of our keys to avoid duplicates
  const targetKeys = new Set(['DEEP_SSO_DOMAIN', 'DEEP_SSO_CLIENT_ID', 'DEEP_SSO_CLIENT_SECRET', 'LOCAL_APP_URL']);
  const filtered = entries.filter((e) => !e.key || !targetKeys.has(e.key));
  const setKV = (k: string, v: string) => filtered.push({ key: k, raw: `${k}=${v}` });

  // Write with quotes to match existing style
  setKV('DEEP_SSO_DOMAIN', `"${domain}"`);
  if (clientId) setKV('DEEP_SSO_CLIENT_ID', `"${clientId}"`);
  if (clientSecret || !entries.find((e) => e.key === 'DEEP_SSO_CLIENT_SECRET')) {
    setKV('DEEP_SSO_CLIENT_SECRET', `"${clientSecret || ''}"`);
  }
  setKV('LOCAL_APP_URL', `"http://localhost:3000"`);

  const out = serializeEnv(filtered);
  await fsp.writeFile(envPath, out, 'utf8');
  const verify = (await fsp.readFile(envPath, 'utf8')).split(/\r?\n/).filter(l =>
    /^DEEP_SSO_DOMAIN=/.test(l) ||
    /^DEEP_SSO_CLIENT_ID=/.test(l) ||
    /^DEEP_SSO_CLIENT_SECRET=/.test(l) ||
    /^LOCAL_APP_URL=/.test(l)
  );
  console.log('Updated .env.local with Deep-ID local credentials and LOCAL_APP_URL:');
  for (const l of verify) console.log(` - ${l}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
