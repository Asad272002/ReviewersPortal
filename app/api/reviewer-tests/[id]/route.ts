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

// GET: Fetch a test with questions (reviewers and admins)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwt(req);
  if (!verified || (verified.role !== 'reviewer' && verified.role !== 'admin')) {
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
    
    if (!test) {
      return NextResponse.json({ success: false, error: 'Test not found' }, { status: 404 });
    }

    // Only reviewers are restricted to active tests. Admins can view any status (e.g. for preview).
    if (verified.role !== 'admin' && test.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Test not found or inactive' }, { status: 404 });
    }
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('reviewer_test_questions')
      .select('*')
      .eq('test_id', id)
      .order('order_index', { ascending: true });
    if (qErr) throw qErr;
    return NextResponse.json({ success: true, test, questions: questions || [] });
  } catch (e: any) {
    console.error('GET /api/reviewer-tests/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch test' }, { status: 500 });
  }
}