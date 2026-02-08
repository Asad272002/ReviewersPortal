import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const secretKey = process.env.JWT_SECRET || 'your-secret-key';
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    
    // Check if user is a partner
    if (payload.role !== 'partner') {
      return NextResponse.json({ success: false, message: 'Forbidden: Partners only' }, { status: 403 });
    }

    const body = await request.json();
    const { report_id, verdict, comment } = body;

    if (!report_id || !verdict) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (!['Approve', 'Reject'].includes(verdict)) {
      return NextResponse.json({ success: false, message: 'Invalid verdict' }, { status: 400 });
    }

    const partnerId = payload.userId;

    // Check if review already exists
    const { data: existing } = await supabaseAdmin
      .from('partner_reviews')
      .select('id')
      .eq('report_id', report_id)
      .eq('partner_id', partnerId)
      .single();

    let error;
    
    if (existing) {
      // Update
      const { error: updateError } = await supabaseAdmin
        .from('partner_reviews')
        .update({
          verdict,
          comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      error = updateError;
    } else {
      // Insert
      const { error: insertError } = await supabaseAdmin
        .from('partner_reviews')
        .insert({
          report_id,
          partner_id: partnerId,
          verdict,
          comment
        });
      error = insertError;
    }

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Review submitted successfully' });

  } catch (error: any) {
    console.error('Error submitting partner review:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
