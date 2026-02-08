import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return false;
  
  try {
    const { jwtVerify } = await import('jose');
    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    const { error } = await supabaseAdmin
      .from('partners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Partner deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting partner:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { username, password, name, organization_id } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (username) updates.username = username;
    if (password) updates.password = password;
    if (name) updates.name = name;
    if (organization_id !== undefined) {
      updates.organization_id = organization_id;
      
      // Also fetch and update organization name for consistency with legacy 'organization' column
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', organization_id)
        .single();
        
      if (org) {
        updates.organization = org.name;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, partner: data });
  } catch (error: any) {
    console.error('Error updating partner:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
