import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Re-implementing verify helper to avoid import issues if relative paths are tricky or if it's not exported
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

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, partners: data });
  } catch (error: any) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { username, password, name, organization_id } = body;

    if (!username || !password || !name || !organization_id) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Check if username exists
    const { data: existing } = await supabaseAdmin
      .from('partners')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 400 });
    }

    // Fetch organization name for consistency
    let organizationName = '';
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();
      
    if (org) {
      organizationName = org.name;
    }

    const { data, error } = await supabaseAdmin
      .from('partners')
      .insert({
        username,
        password, // Note: In production, hash this!
        name,
        organization_id,
        organization: organizationName
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, partner: data });
  } catch (error: any) {
    console.error('Error creating partner:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
