import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';

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
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwt(req);
  if (!verified || verified.role !== 'reviewer') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: submissionId } = await context.params;
  try {
    const { data: subRows, error: sErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .select('*')
      .eq('id', submissionId)
      .limit(1);
    if (sErr) throw sErr;
    const submission = (subRows && subRows[0]) || null;
    if (!submission || String(submission.user_id) !== verified.userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    // Fetch test meta for grading mode visibility
    const { data: tests, error: tErr } = await supabaseAdmin
      .from('reviewer_tests')
      .select('id, grading_mode, name')
      .eq('id', submission.test_id)
      .limit(1);
    if (tErr) throw tErr;
    const test = (tests && tests[0]) || null;

    const { data: answers, error: aErr } = await supabaseAdmin
      .from('reviewer_test_answers')
      .select('id,question_id,answer_text,selected_options,score,graded')
      .eq('submission_id', submissionId);
    if (aErr) throw aErr;
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('reviewer_test_questions')
      .select('id,prompt,type,marks,options,order_index')
      .eq('test_id', submission.test_id)
      .order('order_index', { ascending: true });
    if (qErr) throw qErr;
    return NextResponse.json({ success: true, submission, test, answers: answers || [], questions: questions || [] });
  } catch (e: any) {
    console.error('GET /api/reviewer-tests/submissions/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch submission detail' }, { status: 500 });
  }
}
