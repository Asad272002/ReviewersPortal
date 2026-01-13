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

async function verifyJwtAndGetUser(req: NextRequest): Promise<{ userId: string; username: string; role: Role } | null> {
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
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: submissionId } = await context.params;
  try {
    const { data: submissionRows, error: sErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .select('*')
      .eq('id', submissionId)
      .limit(1);
    if (sErr) throw sErr;
    const submission = (submissionRows && submissionRows[0]) || null;
    if (!submission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }
    const { data: answers, error: aErr } = await supabaseAdmin
      .from('reviewer_test_answers')
      .select('id,question_id,answer_text,selected_options,score,graded,created_at,updated_at')
      .eq('submission_id', submissionId);
    if (aErr) throw aErr;
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('reviewer_test_questions')
      .select('id,prompt,type,marks,options,order_index')
      .eq('test_id', submission.test_id)
      .order('order_index', { ascending: true });
    if (qErr) throw qErr;
    return NextResponse.json({ success: true, submission, answers: answers || [], questions: questions || [] });
  } catch (e: any) {
    console.error('GET /api/admin/reviewer-tests/submissions/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch submission' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: submissionId } = await context.params;
  try {
    const body = await req.json();
    const answers = Array.isArray(body?.answers) ? body.answers : [];
    const finalDecision = body?.finalDecision != null ? String(body.finalDecision) : undefined;

    // Update individual answer scores (manual grading for text)
    for (const a of answers) {
      const aid = a?.answerId;
      const score = a?.score != null ? Number(a.score) : null;
      if (!aid) continue;
      const patch: any = { updated_at: new Date().toISOString() };
      if (score != null) {
        patch.score = score;
        patch.graded = true;
      }
      const { error: uErr } = await supabaseAdmin
        .from('reviewer_test_answers')
        .update(patch)
        .eq('id', aid);
      if (uErr) throw uErr;
    }

    // Recompute total score
    const { data: ansRows, error: lErr } = await supabaseAdmin
      .from('reviewer_test_answers')
      .select('score')
      .eq('submission_id', submissionId);
    if (lErr) throw lErr;
    const total = (ansRows || [])
      .map((r: any) => (r?.score != null ? Number(r.score) : 0))
      .reduce((sum: number, v: number) => sum + v, 0);

    const patchSubmission: any = {
      total_score: total,
      status: 'graded',
      updated_at: new Date().toISOString(),
    };
    if (finalDecision !== undefined) {
      patchSubmission.final_decision = finalDecision;
    }
    const { error: sUpdErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .update(patchSubmission)
      .eq('id', submissionId);
    if (sUpdErr) throw sUpdErr;

    return NextResponse.json({ success: true, totalScore: total });
  } catch (e: any) {
    console.error('PATCH /api/admin/reviewer-tests/submissions/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to grade submission' }, { status: 500 });
  }
}

