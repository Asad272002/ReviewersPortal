import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Role = 'admin' | 'reviewer' | 'team';

function normalizeRole(roleRaw: any): Role {
  const roleNorm = String(roleRaw || '').toLowerCase().replace(/\s+/g, '_');
  if (roleNorm === 'admin') return 'admin';
  if (roleNorm === 'team' || roleNorm === 'team_leader') return 'team';
  return 'reviewer';
}

async function verifyJwtAndGetUser(req: NextRequest): Promise<{ userId: string; username: string; role: Role } | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    const userId = String((payload as any)?.userId || '');
    const username = String((payload as any)?.username || '');
    const role = normalizeRole((payload as any)?.role);
    if (!userId) return null;
    return { userId, username, role };
  } catch (e) {
    return null;
  }
}

// GET: Fetch a test with questions (admin only)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const { data: tests, error: tErr } = await supabaseAdmin
      .from('reviewer_tests')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (tErr) throw tErr;
    const test = (tests && tests[0]) || null;
    if (!test) return NextResponse.json({ success: false, error: 'Test not found' }, { status: 404 });

    const { data: questions, error: qErr } = await supabaseAdmin
      .from('reviewer_test_questions')
      .select('*')
      .eq('test_id', id)
      .order('order_index', { ascending: true });
    if (qErr) throw qErr;

    return NextResponse.json({ success: true, test, questions: questions || [] });
  } catch (e: any) {
    console.error('GET /api/admin/reviewer-tests/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch test' }, { status: 500 });
  }
}

// PUT: Update test and replace questions (admin only)
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const body = await req.json();
    const name = body?.name != null ? String(body.name).trim() : undefined;
    const guidelines = body?.guidelines != null ? String(body.guidelines) : undefined;
    const durationSeconds = body?.durationSeconds != null ? Number(body.durationSeconds) : undefined;
    const status = body?.status != null ? String(body.status) : undefined;
    const questions = Array.isArray(body?.questions) ? body.questions : undefined;

    const patch: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (guidelines !== undefined) patch.guidelines = guidelines;
    if (durationSeconds !== undefined) patch.duration_seconds = durationSeconds;
    if (status !== undefined) patch.status = status;

    if (Object.keys(patch).length > 1) {
      const { error: uErr } = await supabaseAdmin
        .from('reviewer_tests')
        .update(patch)
        .eq('id', id);
      if (uErr) throw uErr;
    }

    // Replace questions if provided (force MCQ-only)
    if (questions) {
      // Delete existing
      const { error: dErr } = await supabaseAdmin
        .from('reviewer_test_questions')
        .delete()
        .eq('test_id', id);
      if (dErr) throw dErr;

      // Insert new
      const rows = questions
        .filter((q: any) => q?.type === 'mcq')
        .map((q: any, idx: number) => ({
        test_id: id,
        order_index: q?.orderIndex != null ? Number(q.orderIndex) : idx + 1,
        type: 'mcq',
        prompt: String(q?.prompt || ''),
        options: q?.options ?? [],
        correct_answers: q?.correctAnswers ?? [],
        marks: q?.marks != null ? Number(q.marks) : 1,
        required: q?.required != null ? !!q.required : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error: iErr } = await supabaseAdmin
          .from('reviewer_test_questions')
          .insert(rows);
        if (iErr) throw iErr;
      }
    }

    return NextResponse.json({ success: true, message: 'Updated successfully' });
  } catch (e: any) {
    console.error('PUT /api/admin/reviewer-tests/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to update test' }, { status: 500 });
  }
}

// DELETE: Remove test and cascading questions/submissions (admin only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = params;
  try {
    const { error } = await supabaseAdmin
      .from('reviewer_tests')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (e: any) {
    console.error('DELETE /api/admin/reviewer-tests/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to delete test' }, { status: 500 });
  }
}