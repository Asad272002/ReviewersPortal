/**
 * Bulk import reviewers into `user_app` table.
 *
 * Usage:
 *   1) Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
 *   2) Place your data file at e.g. `scripts/reviewers.json` or `scripts/reviewers.csv`.
 *   3) Run:
 *        node scripts/bulk-import-reviewers.js scripts/reviewers.json
 *      Optional flags:
 *        --dry-run   Preview what would be inserted without writing
 *
 * JSON format example (array of objects):
 * [
 *   {
 *     "username": "reviewer1",
 *     "password": "password123",
 *     "name": "Alice Reviewer",
 *     "email": "alice@example.com",
 *     "expertise": "AI",
 *     "cvLink": "https://example.com/cv.pdf",
 *     "organization": "Org",
 *     "yearsExperience": 5,
 *     "linkedinUrl": "https://linkedin.com/in/alice",
 *     "githubIds": "alice-gh",
 *     "mattermostId": "alice-mm",
 *     "otherCircle": false
 *   }
 * ]
 *
 * CSV format example (with header row):
 * username,password,name,email,expertise,cvLink,organization,yearsExperience,linkedinUrl,githubIds,mattermostId,otherCircle
 * reviewer1,password123,Alice Reviewer,alice@example.com,AI,https://example.com/cv.pdf,Org,5,https://linkedin.com/in/alice,alice-gh,alice-mm,false
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function parseCSV(text) {
  // Robust CSV parser that supports quoted fields with embedded commas and newlines
  const rows = [];
  let headers = null;
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';

    if (ch === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote inside quoted field
        field += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') {
        // Windows CRLF, skip the \n in next loop
      }
      // End of record
      row.push(field);
      field = '';
      if (row.length > 1 || (row.length === 1 && row[0].trim().length > 0)) {
        if (!headers) {
          headers = row.map(h => String(h || '').trim());
        } else {
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = String(row[idx] ?? '').trim();
          });
          rows.push(obj);
        }
      }
      row = [];
    } else {
      field += ch;
    }
  }

  // Handle last record if file doesn't end with newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!headers) {
      headers = row.map(h => String(h || '').trim());
    } else {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = String(row[idx] ?? '').trim();
      });
      rows.push(obj);
    }
  }

  return rows;
}

function getField(src, keys) {
  for (const k of keys) {
    if (src[k] !== undefined && String(src[k]).trim() !== '') {
      return String(src[k]).trim();
    }
  }
  return '';
}

function normalizeDate(input) {
  if (!input) return new Date().toISOString();
  const s = String(input).trim();
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  // Try MM/DD/YYYY HH:mm
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    const yyyy = m[3];
    const HH = m[4].padStart(2, '0');
    const min = m[5].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${HH}:${min}:00Z`;
  }
  return new Date().toISOString();
}

function toUserRow(src, index) {
  const nowISO = new Date().toISOString();
  const id = crypto.randomUUID();
  // Accept both JSON-style (lowerCamel) and CSV-style (DB column casing)
  const username = getField(src, ['username', 'Username']);
  const password = getField(src, ['password', 'Password']) || 'password123';
  const name = getField(src, ['name', 'Name']);
  const email = getField(src, ['email', 'Email']);
  const roleRaw = getField(src, ['role', 'Role']);
  const statusRaw = getField(src, ['status', 'Status']);
  const createdAtRaw = getField(src, ['createdAt', 'CreatedAt']);
  const updatedAtRaw = getField(src, ['updatedAt', 'UpdatedAt']);

  if (!username || !password || !name) {
    return null; // invalid row
  }

  const row = {
    ID: id,
    Username: username,
    Password: password,
    Name: name,
    Role: (roleRaw && roleRaw.toLowerCase() === 'reviewer') ? 'reviewer' : 'reviewer',
    Email: email,
    Status: statusRaw || 'active',
    CreatedAt: createdAtRaw ? normalizeDate(createdAtRaw) : nowISO,
    UpdatedAt: updatedAtRaw ? normalizeDate(updatedAtRaw) : nowISO,
  };

  // Optional reviewer extras
  // Map optional reviewer extras to Supabase column names
  const expertise = getField(src, ['expertise', 'Expertise']);
  const cvLink = getField(src, ['cvLink', 'CVLink']);
  const organization = getField(src, ['organization', 'Organization']);
  const yearsExperience = getField(src, ['yearsExperience', 'YearsExperience']);
  const linkedinUrl = getField(src, ['linkedinUrl', 'LinkedInURL']);
  const githubIds = getField(src, ['githubIds', 'GitHubIDs']);
  const mattermostId = getField(src, ['mattermostId', 'MattermostId']);
  const otherCircle = getField(src, ['otherCircle', 'OtherCircle']);

  if (expertise) row.Expertise = expertise;
  if (cvLink) row.CVLink = cvLink;
  if (organization) row.Organization = organization;
  if (yearsExperience) row.YearsExperience = yearsExperience;
  if (linkedinUrl) row.LinkedInURL = linkedinUrl;
  if (githubIds) row.GitHubIDs = githubIds;
  if (mattermostId) row.MattermostId = mattermostId;
  if (otherCircle) row.OtherCircle = otherCircle; // preserve provided string values

  return row;
}

async function main() {
  const inputPath = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!inputPath) {
    console.error('Usage: node scripts/bulk-import-reviewers.js <file.json|file.csv> [--dry-run]');
    process.exit(1);
  }

  const fullPath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const ext = path.extname(fullPath).toLowerCase();
  let raw;
  try {
    raw = fs.readFileSync(fullPath, 'utf8');
  } catch (e) {
    console.error('Failed to read file:', e.message);
    process.exit(1);
  }

  let records = [];
  try {
    if (ext === '.json') {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
      records = parsed;
    } else if (ext === '.csv') {
      records = parseCSV(raw);
    } else {
      throw new Error('Unsupported file type. Use .json or .csv');
    }
  } catch (e) {
    console.error('Failed to parse input:', e.message);
    process.exit(1);
  }

  const rows = [];
  for (let i = 0; i < records.length; i++) {
    const row = toUserRow(records[i], i);
    if (row) rows.push(row);
  }

  if (rows.length === 0) {
    console.error('No valid rows to insert. Ensure username, password, and name are provided.');
    process.exit(1);
  }

  // Fetch existing usernames to avoid duplicates
  const { data: existingData, error: existingErr } = await supabaseAdmin
    .from('user_app')
    .select('Username')
    .limit(2000);

  if (existingErr) {
    console.error('Failed to fetch existing users:', existingErr.message || existingErr);
    process.exit(1);
  }

  const existing = new Set((existingData || []).map(r => String(r.Username).trim().toLowerCase()));
  const toInsert = rows.filter(r => !existing.has(String(r.Username).trim().toLowerCase()));
  const skipped = rows.length - toInsert.length;

  console.log(`Parsed: ${records.length}`);
  console.log(`Valid rows: ${rows.length}`);
  console.log(`Duplicates skipped by username: ${skipped}`);
  console.log(`Will insert: ${toInsert.length}`);

  if (dryRun) {
    console.log('Dry run — no writes performed. Sample payload:');
    console.log(JSON.stringify(toInsert.slice(0, 3), null, 2));
    process.exit(0);
  }

  if (toInsert.length === 0) {
    console.log('Nothing to insert. Exiting.');
    process.exit(0);
  }

  // Insert in small batches
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabaseAdmin.from('user_app').insert(batch);
    if (error) {
      console.error('Insert error:', error.message || error);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${toInsert.length}...`);
  }

  console.log(`Done. Inserted ${inserted} reviewers.`);
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});