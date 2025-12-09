// Export Supabase public schema (tables + columns) to supabase/schema-cache.json
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function fetchViews() {
  const { data: tables, error: tErr } = await supabase
    .from('api_tables')
    .select('table_name, table_type')
    .order('table_name');
  const { data: cols, error: cErr } = await supabase
    .from('api_columns')
    .select('table_name, column_name, data_type, is_nullable, character_maximum_length, numeric_precision, numeric_scale')
    .order('table_name')
    .order('column_name');
  if (tErr || cErr) return null;
  return { tables, cols };
}

async function sampleKnownTables() {
  const known = [
    'milestone_review_reports',
    'chat_sessions',
    'chat_messages',
    'reviewer_tests',
    'reviewer_test_questions',
    'reviewer_test_submissions',
    'reviewer_test_answers',
    'processes',
    'resources',
    'announcement',
    'support_tickets',
    'voting_results',
    'rd',
    'user_app',
    'awarded_teams',
    'team_reviewer_assignment',
  ];
  const tables = [];
  const cols = [];
  for (const t of known) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        tables.push({ table_name: t, table_type: 'BASE TABLE', error: error.message });
        continue;
      }
      tables.push({ table_name: t, table_type: 'BASE TABLE' });
      const row = (data && data[0]) || {};
      Object.keys(row).forEach((column_name) => {
        cols.push({ table_name: t, column_name, data_type: 'unknown', is_nullable: 'UNKNOWN' });
      });
    } catch (e) {
      tables.push({ table_name: t, table_type: 'BASE TABLE', error: String(e.message || e) });
    }
  }
  return { tables, cols };
}

async function main() {
  const views = await fetchViews();
  const payload = views || (await sampleKnownTables());
  const outDir = path.join(process.cwd(), 'supabase');
  const outFile = path.join(outDir, 'schema-cache.json');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`Schema exported to ${outFile}`);
}

main().catch((e) => {
  console.error('Failed to export Supabase schema:', e);
  process.exit(1);
});

