import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('milestone_review_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Fetch partner reviews
    const { data: partnerReviews, error: prError } = await supabaseAdmin
      .from('partner_reviews')
      .select('*');
    
    if (prError) console.error('Error fetching partner reviews:', prError);

    // Create a map for partner reviews by report_id
    const reviewsMap = new Map();
    if (partnerReviews) {
      partnerReviews.forEach((pr: any) => {
        reviewsMap.set(pr.report_id, pr);
      });
    }

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
      reportLink: r.document_url || '',
      isSharedWithPartner: r.is_shared_with_partner || false,
      partnerReview: reviewsMap.get(r.id) || null
    }));
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to list reports' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 405 });
}
