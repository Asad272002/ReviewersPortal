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

// GET: List current user's reviewer test submissions
export async function GET(req: NextRequest) {
  const verified = await verifyJwt(req);
  if (!verified || verified.role !== 'reviewer') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data: submissions, error } = await supabaseAdmin
      .from('reviewer_test_submissions')
      .select('id,test_id,status,total_score,submitted_at,time_taken_seconds,created_at,updated_at')
      .eq('user_id', verified.userId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, submissions: submissions || [] });
  } catch (e: any) {
    console.error('GET /api/reviewer-tests/submissions error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to list submissions' }, { status: 500 });
  }
}