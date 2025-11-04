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

// GET: List active tests (reviewers and admins)
export async function GET(req: NextRequest) {
  const verified = await verifyJwt(req);
  if (!verified || (verified.role !== 'reviewer' && verified.role !== 'admin')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('reviewer_tests')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, tests: data || [] });
  } catch (e: any) {
    console.error('GET /api/reviewer-tests error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch tests' }, { status: 500 });
  }
}