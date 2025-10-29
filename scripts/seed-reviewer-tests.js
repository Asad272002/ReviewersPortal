// Seed sample Reviewer Tests and Questions into Supabase
// Usage: node scripts/seed-reviewer-tests.js

const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  console.error('Create and fill .env.local, then re-run:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function ensureTest(name, guidelines, durationSeconds = 900) {
  const { data: existing, error: selErr } = await supabase
    .from('reviewer_tests')
    .select('id,name,status')
    .eq('name', name)
    .limit(1);
  if (selErr) throw selErr;
  if (existing && existing.length > 0) {
    const row = existing[0];
    console.log(`Test already exists: ${row.name} (${row.id}) status=${row.status}`);
    // If not active, update to active for testing
    if (row.status !== 'active') {
      await supabase.from('reviewer_tests').update({ status: 'active' }).eq('id', row.id);
      console.log('  Updated status to active');
    }
    return row.id;
  }

  const payload = {
    name,
    guidelines,
    duration_seconds: durationSeconds,
    status: 'active',
    created_by: 'seed_script',
    created_by_username: 'seed_admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: ins, error: insErr } = await supabase
    .from('reviewer_tests')
    .insert([payload])
    .select('id')
    .limit(1);
  if (insErr) throw insErr;
  const id = ins && ins[0]?.id;
  console.log(`Created test: ${name} (${id})`);
  return id;
}

async function upsertQuestions(testId) {
  // Simple guard: do nothing if questions already exist
  const { data: existingQs, error: qSelErr } = await supabase
    .from('reviewer_test_questions')
    .select('id')
    .eq('test_id', testId)
    .limit(1);
  if (qSelErr) throw qSelErr;
  if (existingQs && existingQs.length > 0) {
    console.log('Questions already exist for this test; skipping insert.');
    return;
  }

  const mcq = {
    test_id: testId,
    order_index: 1,
    type: 'mcq',
    prompt: 'Which of the following are fruits? (Select all that apply)',
    options: [
      { id: 'a', label: 'Apple' },
      { id: 'b', label: 'Carrot' },
      { id: 'c', label: 'Banana' },
      { id: 'd', label: 'Potato' },
    ],
    correct_answers: ['a', 'c'],
    marks: 2,
    required: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const textQ = {
    test_id: testId,
    order_index: 2,
    type: 'text',
    prompt: 'In 2–3 sentences, describe a fair review process.',
    options: null,
    correct_answers: null,
    marks: 3,
    required: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: qInsErr } = await supabase
    .from('reviewer_test_questions')
    .insert([mcq, textQ]);
  if (qInsErr) throw qInsErr;
  console.log('Inserted 2 questions (1 MCQ, 1 text).');
}

async function main() {
  try {
    console.log('Seeding Reviewer Tests...');
    const testId = await ensureTest(
      'Sample Reviewer Test',
      'Please read the guidelines carefully. This test has two questions: one MCQ and one short text answer.',
      900
    );
    await upsertQuestions(testId);

    console.log('\nVerification:');
    const { data: tests } = await supabase
      .from('reviewer_tests')
      .select('id,name,status,duration_seconds')
      .eq('id', testId)
      .limit(1);
    console.log(' Test:', tests && tests[0]);

    const { data: qs } = await supabase
      .from('reviewer_test_questions')
      .select('id,type,prompt,order_index,marks')
      .eq('test_id', testId)
      .order('order_index', { ascending: true });
    console.log(' Questions:', qs);

    console.log('\n✅ Seed complete. Open /reviewer-tests to view the test.');
  } catch (e) {
    console.error('Seed failed:', e?.message || e);
    process.exit(1);
  }
}

main();