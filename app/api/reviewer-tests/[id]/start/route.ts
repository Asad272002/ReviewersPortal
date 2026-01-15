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

// POST: Mark test as started (creates in_progress submission if none exists)
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwt(req);
  if (!verified || verified.role !== 'reviewer') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: testId } = await context.params;
  try {
    // Ensure test exists and is active
    const { data: tests, error: tErr } = await supabaseAdmin
      .from('reviewer_tests')
      .select('id,status')
      .eq('id', testId)
      .limit(1);
    if (tErr) throw tErr;
    const test = (tests && tests[0]) || null;
    if (!test || test.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Test not found or inactive' }, { status: 404 });
    }

    // If already submitted, disallow starting
    const { data: existingSubmitted, error: subErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .select('id,status')
      .eq('test_id', testId)
      .eq('user_id', verified.userId)
      .eq('status', 'submitted')
      .limit(1);
    if (subErr) throw subErr;
    if (existingSubmitted && existingSubmitted.length > 0) {
      return NextResponse.json({ success: false, error: 'You have already submitted this test' }, { status: 409 });
    }

    // If in_progress exists, return it; else create one
    const { data: existingProgress, error: progErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .select('id,status,started_at')
      .eq('test_id', testId)
      .eq('user_id', verified.userId)
      .eq('status', 'in_progress')
      .limit(1);
    if (progErr) throw progErr;

    if (existingProgress && existingProgress.length > 0) {
      const row = existingProgress[0];
      return NextResponse.json({ success: true, submissionId: row.id, startedAt: row.started_at });
    }

    const nowIso = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .insert([{
        test_id: testId,
        user_id: verified.userId,
        username: verified.username,
        status: 'in_progress',
        started_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      }])
      .select('id,started_at')
      .limit(1);
    if (insErr) throw insErr;
    const sub = inserted && inserted[0];
    return NextResponse.json({ success: true, submissionId: sub.id, startedAt: sub.started_at });
  } catch (e: any) {
    console.error('POST /api/reviewer-tests/[id]/start error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to start test' }, { status: 500 });
  }
}
