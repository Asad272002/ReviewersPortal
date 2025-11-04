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

// GET: List all tests with basic info (admin only)
export async function GET(req: NextRequest) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    let query = supabaseAdmin.from('reviewer_tests').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, tests: data || [] });
  } catch (e: any) {
    console.error('GET /api/admin/reviewer-tests error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch tests' }, { status: 500 });
  }
}

// POST: Create a new test (admin only)
export async function POST(req: NextRequest) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const guidelines = String(body?.guidelines || '');
    const durationSeconds = Number(body?.durationSeconds || 0);
    const status = String(body?.status || 'draft');

    if (!name || !durationSeconds || durationSeconds <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid name or durationSeconds' }, { status: 400 });
    }

    const insertPayload: any = {
      name,
      guidelines,
      duration_seconds: durationSeconds,
      status,
      created_by: verified.userId,
      created_by_username: verified.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('reviewer_tests')
      .insert([insertPayload])
      .select('*')
      .limit(1);
    if (error) throw error;
    const test = (data && data[0]) || null;
    if (!test) {
      return NextResponse.json({ success: false, error: 'Failed to create test' }, { status: 500 });
    }
    return NextResponse.json({ success: true, test });
  } catch (e: any) {
    console.error('POST /api/admin/reviewer-tests error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create test' }, { status: 500 });
  }
}