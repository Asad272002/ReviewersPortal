// Inspect Supabase public schema: list tables and columns safely via service role
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function listViaViews() {
  const { data: tables, error: tErr } = await supabase
    .from('api_tables')
    .select('table_name, table_type')
    .order('table_name');
  const { data: cols, error: cErr } = await supabase
    .from('api_columns')
    .select('table_name, column_name, data_type, is_nullable')
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
    'awarded_teams',
  ];
  const results = [];
  for (const t of known) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        results.push({ table: t, error: error.message });
      } else {
        const row = (data && data[0]) || {};
        const columns = Object.keys(row);
        results.push({ table: t, columns });
      }
    } catch (e) {
      results.push({ table: t, error: String(e.message || e) });
    }
  }
  return results;
}

async function main() {
  const viaViews = await listViaViews();
  if (viaViews) {
    console.log('Tables (public):');
    viaViews.tables.forEach((t) => {
      console.log(`- ${t.table_name} (${t.table_type})`);
    });
    console.log('\nColumns:');
    const grouped = viaViews.cols.reduce((acc, c) => {
      acc[c.table_name] = acc[c.table_name] || [];
      acc[c.table_name].push(`${c.column_name} : ${c.data_type} ${c.is_nullable === 'YES' ? '(nullable)' : ''}`);
      return acc;
    }, {});
    Object.entries(grouped).forEach(([table, cols]) => {
      console.log(`\n${table}`);
      cols.forEach((line) => console.log(`  - ${line}`));
    });
    return;
  }

  console.warn('api_tables/api_columns views not available; showing sample columns from known tables (first row).');
  const samples = await sampleKnownTables();
  samples.forEach((r) => {
    if (r.error) {
      console.log(`\n${r.table}: error ${r.error}`);
    } else {
      console.log(`\n${r.table}`);
      (r.columns || []).forEach((c) => console.log(`  - ${c}`));
    }
  });
}

main().catch((e) => {
  console.error('Failed to inspect Supabase schema:', e);
  process.exit(1);
});

