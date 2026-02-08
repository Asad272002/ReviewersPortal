import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwtAndGetUser } from '@/lib/auth/admin-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: organizations, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, organizations });
  } catch (e: any) {
    console.error('GET /api/admin/organizations error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch organizations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, project_config } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .insert({ name, description, project_config: project_config || [] })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, organization: data });
  } catch (e: any) {
    console.error('POST /api/admin/organizations error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create organization' }, { status: 500 });
  }
}
