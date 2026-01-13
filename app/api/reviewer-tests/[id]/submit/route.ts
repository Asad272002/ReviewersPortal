import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'admin' | 'reviewer' | 'team_leader';

function normalizeRole(roleRaw: any): Role {
  const roleNorm = String(roleRaw || '').toLowerCase().replace(/\s+/g, '_');
  if (roleNorm === 'admin') return 'admin';
  if (roleNorm === 'team_leader') return 'team_leader';
  return 'reviewer';
}

async function verifyJwt(req: NextRequest): Promise<{ userId: string; username: string; role: Role } | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: String((payload as any)?.userId || ''),
      username: String((payload as any)?.username || ''),
      role: normalizeRole((payload as any)?.role)
    };
  } catch (e) {
    return null;
  }
}

function arraysEqualIgnoreOrder(a: any[], b: any[]) {
  if (a.length !== b.length) return false;
  const as = [...a].map(String).sort();
  const bs = [...b].map(String).sort();
  for (let i = 0; i < as.length; i++) {
    if (as[i] !== bs[i]) return false;
  }
  return true;
}

// POST: Submit test answers (reviewers)
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwt(req);
  if (!verified || verified.role !== 'reviewer') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: testId } = await context.params;
  try {
    const body = await req.json();
    const answers = Array.isArray(body?.answers) ? body.answers : [];
    const elapsedSeconds = body?.elapsedSeconds != null ? Number(body.elapsedSeconds) : null;

    // Ensure test exists and active
    const { data: tests, error: tErr } = await supabaseAdmin
      .from('reviewer_tests')
      .select('*')
      .eq('id', testId)
      .limit(1);
    if (tErr) throw tErr;
    const test = (tests && tests[0]) || null;
    if (!test || test.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Test not found or inactive' }, { status: 404 });
    }

    // Prevent duplicate final submissions by same user
    const { data: existingSubs, error: sErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .select('id,status')
      .eq('test_id', testId)
      .eq('user_id', verified.userId)
      .eq('status', 'submitted')
      .limit(1);
    if (sErr) throw sErr;
    if (existingSubs && existingSubs.length > 0) {
      return NextResponse.json({ success: false, error: 'You have already submitted this test' }, { status: 409 });
    }

    const { data: questions, error: qErr } = await supabaseAdmin
      .from('reviewer_test_questions')
      .select('*')
      .eq('test_id', testId)
      .order('order_index', { ascending: true });
    if (qErr) throw qErr;

    // Index questions by id
    const qMap = new Map<string, any>();
    (questions || []).forEach((q: any) => qMap.set(String(q.id), q));

    const gradingMode = String((test as any)?.grading_mode || 'auto');

    // Compute scoring for MCQs (or defer all to admin when manual)
    let totalScore = 0;
    let autoScoreCompleted = true;

    const answerRows: any[] = [];
    for (const a of answers) {
      const qid = String(a?.questionId || a?.question_id || '');
      const q = qMap.get(qid);
      if (!q) continue;
      let score: number | null = null;
      let ansStored: any = null;
      if (gradingMode === 'manual') {
        score = null;
        autoScoreCompleted = false;
        if (q.type === 'mcq') {
          const given = Array.isArray(a?.answer) ? a.answer : [a?.answer].filter(Boolean);
          ansStored = given;
        } else {
          ansStored = a?.answer ?? null;
        }
      } else {
        if (q.type === 'mcq') {
          const correct = Array.isArray(q.correct_answers) ? q.correct_answers : [];
          const given = Array.isArray(a?.answer) ? a.answer : [a?.answer].filter(Boolean);
          if (arraysEqualIgnoreOrder(given.map(String), correct.map(String))) {
            score = Number(q.marks || 0);
          } else {
            score = 0;
          }
          totalScore += score || 0;
          ansStored = given;
        } else {
          // text question requires manual grading
          score = null;
          autoScoreCompleted = false;
          ansStored = a?.answer ?? null;
        }
      }
      answerRows.push({
        test_id: testId,
        question_id: qid,
        user_id: verified.userId,
        answer_text: q.type === 'text' ? (typeof ansStored === 'string' ? ansStored : JSON.stringify(ansStored)) : null,
        selected_options: q.type === 'mcq' ? (Array.isArray(ansStored) ? ansStored : null) : null,
        score,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Create submission record (align with Supabase schema)
    const submissionRow = {
      test_id: testId,
      user_id: verified.userId,
      username: verified.username,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      time_taken_seconds: elapsedSeconds,
      total_score: totalScore,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: subIns, error: subErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .insert([submissionRow])
      .select('id')
      .limit(1);
    if (subErr) throw subErr;
    const submissionId = subIns && subIns[0]?.id;

    // Insert answers (link to submission_id per schema)
    if (answerRows.length > 0) {
      const rows = answerRows.map((row: any) => ({
        submission_id: submissionId,
        question_id: row.question_id,
        answer_text: row.answer_text,
        selected_options: row.selected_options,
        score: row.score,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { error: aErr } = await supabaseAdmin
        .from('reviewer_test_answers')
        .insert(rows);
      if (aErr) throw aErr;
    }

    return NextResponse.json({ success: true, submissionId, totalScore, autoScoreCompleted });
  } catch (e: any) {
    console.error('POST /api/reviewer-tests/[id]/submit error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to submit test' }, { status: 500 });
  }
}
