import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  try {
    // Try fetching from Supabase tables; gracefully fall back to empty arrays.
    let awardedTeams: any[] = [];
    let reviewers: any[] = [];
    let assignments: any[] = [];

    try {
      const { data: teamData, error: teamErr } = await supabaseAdmin
        .from('awarded_teams')
        .select('*')
        .limit(1000);
      if (!teamErr && Array.isArray(teamData)) {
        awardedTeams = teamData.map((row: any) => ({
          id: row.id,
          teamName: row.teamName ?? row.name ?? '',
          proposalId: row.proposalId ?? '',
          proposalTitle: row.proposalTitle ?? row.projectTitle ?? '',
          teamLeaderUsername: row.teamLeaderUsername ?? '',
          teamLeaderEmail: row.teamLeaderEmail ?? row.email ?? '',
          teamLeaderName: row.teamLeaderName ?? '',
          awardDate: row.awardDate ?? '',
          status: row.status ?? 'active',
          createdAt: row.createdAt ?? '',
          updatedAt: row.updatedAt ?? ''
        }));
      }
    } catch (e) {
      console.warn('Supabase awarded_teams fetch failed, returning empty list');
    }

    try {
      const { data: reviewerData, error: reviewerErr } = await supabaseAdmin
        .from('reviewers')
        .select('*')
        .limit(1000);
      if (!reviewerErr && Array.isArray(reviewerData)) {
        reviewers = reviewerData.map((row: any) => ({
          id: row.id,
          userID: row.userID ?? '',
          name: row.name ?? '',
          email: row.email ?? '',
          mattermostId: row.mattermostId ?? '',
          githubIds: row.githubIds ?? '',
          cvLink: row.cvLink ?? '',
          expertise: row.expertise ?? '',
          isAvailable: !!(row.isAvailable ?? false),
          anonymousName: row.anonymousName ?? '',
          createdAt: row.createdAt ?? '',
          updatedAt: row.updatedAt ?? ''
        }));
      }
    } catch (e) {
      console.warn('Supabase reviewers fetch failed, returning empty list');
    }

    try {
      const { data: assignmentData, error: assignErr } = await supabaseAdmin
        .from('team_reviewer_assignments')
        .select('*')
        .limit(1000);
      if (!assignErr && Array.isArray(assignmentData)) {
        assignments = assignmentData.map((row: any) => ({
          id: row.id,
          teamId: row.teamId ?? '',
          reviewerId: row.reviewerId ?? '',
          assignedBy: row.assignedBy ?? '',
          assignedAt: row.assignedAt ?? '',
          status: row.status ?? 'pending',
          approvedBy: row.approvedBy ?? undefined,
          approvedAt: row.approvedAt ?? undefined,
          revokedBy: row.revokedBy ?? undefined,
          revokedAt: row.revokedAt ?? undefined,
          notes: row.notes ?? undefined,
          createdAt: row.createdAt ?? '',
          updatedAt: row.updatedAt ?? ''
        }));
      }
    } catch (e) {
      console.warn('Supabase team_reviewer_assignments fetch failed, returning empty list');
    }

    return NextResponse.json({
      success: true,
      data: { awardedTeams, reviewers, assignments }
    });
  } catch (error) {
    console.error('Error fetching awarded teams data (Supabase):', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch awarded teams data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Not implemented in Supabase yet; return a clear message to avoid Google Sheets usage.
    return NextResponse.json(
      { success: false, message: 'Awarded Teams mutations are not yet implemented in Supabase' },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}