import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwtAndGetUser } from '@/lib/auth/admin-auth';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, description, project_config } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (project_config !== undefined) updates.project_config = project_config;

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, organization: data });
  } catch (e: any) {
    console.error('PUT /api/admin/organizations/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to update organization' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const verified = await verifyJwtAndGetUser(req);
  if (!verified || verified.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (e: any) {
    console.error('DELETE /api/admin/organizations/[id] error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to delete organization' }, { status: 500 });
  }
}
