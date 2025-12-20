import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    let username: string;
    
    try {
        const { payload } = await jwtVerify(token, secret);
        username = payload.username as string;
    } catch (e) {
        return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    // Fetch reports for this user
    // matching reviewer_username or reviewer_handle
    const { data, error } = await supabaseAdmin
      .from('milestone_review_reports')
      .select('*')
      .or(`reviewer_username.eq.${username},reviewer_handle.eq.${username}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reports: data });
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
