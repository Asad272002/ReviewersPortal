const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const now = new Date().toISOString();
  const payload = {
    reviewer_id: 'TEST',
    reviewer_username: 'tester',
    reviewer_handle: 'tester',
    proposal_id: 'TEST-PROP',
    proposal_title: 'Test Proposal',
    milestone_title: 'Test Milestone',
    milestone_number: '1',
    milestone_budget: '0',
    date: now.substring(0, 10),
    verdict: 'approved',
    document_id: 'TEST-DOC-ID',
    document_url: 'https://docs.google.com/document/d/TEST/edit',
    folder_id: 'TEST-FOLDER',
    report_data: { test: true },
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from('milestone_review_reports')
    .insert([payload])
    .select('id');
  if (error) throw error;
  const id = data && data[0] && data[0].id;
  console.log('Inserted test row id:', id);

  const { error: delErr } = await supabase
    .from('milestone_review_reports')
    .delete()
    .eq('id', id);
  if (delErr) throw delErr;
  console.log('Cleaned up test row');
}

main().catch((e) => {
  console.error('Supabase insert test failed:', e.message || e);
  process.exit(1);
});

