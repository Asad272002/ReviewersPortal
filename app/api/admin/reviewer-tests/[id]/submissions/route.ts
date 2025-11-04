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

// GET: List submissions for a given test (admin only)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: testId } = await context.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .select('id,user_id,username,total_score,submitted_at,time_taken_seconds')
      .eq('test_id', testId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, submissions: data || [] });
  } catch (e: any) {
    console.error('GET /api/admin/reviewer-tests/[id]/submissions error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch submissions' }, { status: 500 });
  }
}