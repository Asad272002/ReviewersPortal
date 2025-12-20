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
    let role: string;
    
    try {
        const { payload } = await jwtVerify(token, secret);
        role = payload.role as string;
    } catch (e) {
        return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    if (role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Fetch all reports
    const { data, error } = await supabaseAdmin
      .from('milestone_review_reports')
      .select('id, reviewer_username, reviewer_handle, verdict, created_at, date')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin analysis:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Aggregate Data
    const reports = data || [];
    
    // 1. Reviewer Performance
    const reviewersMap = new Map<string, { 
        name: string, 
        total: number, 
        approved: number, 
        rejected: number,
        lastActive: string 
    }>();

    reports.forEach(r => {
        // Prefer handle, fallback to username, fallback to 'Unknown'
        const name = r.reviewer_handle || r.reviewer_username || 'Unknown Reviewer';
        
        if (!reviewersMap.has(name)) {
            reviewersMap.set(name, { name, total: 0, approved: 0, rejected: 0, lastActive: r.created_at });
        }
        
        const entry = reviewersMap.get(name)!;
        entry.total += 1;
        if (r.verdict === 'Approved') entry.approved += 1;
        if (r.verdict === 'Rejected') entry.rejected += 1;
        
        // Update last active if this report is newer
        if (new Date(r.created_at) > new Date(entry.lastActive)) {
            entry.lastActive = r.created_at;
        }
    });

    const reviewers = Array.from(reviewersMap.values()).sort((a, b) => b.total - a.total);

    return NextResponse.json({ 
        success: true, 
        data: {
            totalReports: reports.length,
            approvedCount: reports.filter(r => r.verdict === 'Approved').length,
            rejectedCount: reports.filter(r => r.verdict === 'Rejected').length,
            reviewers
        }
    });

  } catch (error) {
    console.error('Admin Analysis API error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
