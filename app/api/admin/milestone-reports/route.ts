import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('milestone_review_reports')
      .select('id, reviewer_id, reviewer_username, reviewer_handle, proposal_id, proposal_title, milestone_title, milestone_number, date, verdict, document_url, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const reports = (data || []).map((r: any) => ({
      id: r.id,
      reviewer: r.reviewer_handle || r.reviewer_username || '',
      reviewerId: r.reviewer_id || '',
      reviewerUsername: r.reviewer_username || '',
      reviewerHandle: r.reviewer_handle || '',
      proposalId: r.proposal_id || '',
      proposalTitle: r.proposal_title || '',
      milestoneTitle: r.milestone_title || '',
      milestoneNumber: r.milestone_number || '',
      date: r.date || '',
      verdict: r.verdict || '',
      reportLink: r.document_url || ''
    }));
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to list reports' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 405 });
}
