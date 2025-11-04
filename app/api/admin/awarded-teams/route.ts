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
        // Also fetch legacy table to backfill any missing fields on modern rows
        let legacyById: Record<string, any> = {};
        try {
          const { data: legacyRows, error: legacyErr } = await supabaseAdmin
            .from('awarded_team')
            .select('"ID", "Team Name", "Proposal ID", "Proposal Title", "Team Username", "Team Leader Username", "Team Leader Email", "Team Leader Name", "Award Date", "Status", "Created At", "Updated At"')
            .limit(1000);
          if (!legacyErr && Array.isArray(legacyRows)) {
            legacyById = (legacyRows || []).reduce((acc: Record<string, any>, row: any) => {
              acc[row['ID']] = row;
              return acc;
            }, {});
          }
        } catch (e) {
          console.warn('Supabase awarded_team fallback fetch failed');
        }

        awardedTeams = teamData.map((row: any) => {
          const legacy = legacyById[row.id] || {};
          return {
            id: row.id,
            teamName: row.teamName ?? row.name ?? legacy['Team Name'] ?? '',
            proposalId: row.proposalId ?? legacy['Proposal ID'] ?? '',
            proposalTitle: row.proposalTitle ?? row.projectTitle ?? legacy['Proposal Title'] ?? '',
            teamUsername: row.teamUsername ?? row.teamLeaderUsername ?? legacy['Team Username'] ?? legacy['Team Leader Username'] ?? '',
            teamLeaderUsername: row.teamLeaderUsername ?? legacy['Team Leader Username'] ?? '',
            teamLeaderEmail: row.teamLeaderEmail ?? row.email ?? legacy['Team Leader Email'] ?? '',
            teamLeaderName: row.teamLeaderName ?? legacy['Team Leader Name'] ?? '',
            awardDate: row.awardDate ?? legacy['Award Date'] ?? '',
            status: row.status ?? legacy['Status'] ?? 'active',
            createdAt: row.createdAt ?? legacy['Created At'] ?? '',
            updatedAt: row.updatedAt ?? legacy['Updated At'] ?? ''
          };
        });
      } else {
        const { data: teamData2, error: teamErr2 } = await supabaseAdmin
          .from('awarded_team')
          .select('"ID", "Team Name", "Proposal ID", "Proposal Title", "Team Username", "Team Leader Username", "Team Leader Email", "Team Leader Name", "Award Date", "Status", "Created At", "Updated At"')
          .limit(1000);
        if (!teamErr2 && Array.isArray(teamData2)) {
          awardedTeams = teamData2.map((row: any) => ({
            id: row['ID'],
            teamName: row['Team Name'] ?? '',
            proposalId: row['Proposal ID'] ?? '',
            proposalTitle: row['Proposal Title'] ?? '',
            teamUsername: row['Team Username'] ?? row['Team Leader Username'] ?? '',
            teamLeaderUsername: row['Team Leader Username'] ?? '',
            teamLeaderEmail: row['Team Leader Email'] ?? '',
            teamLeaderName: row['Team Leader Name'] ?? '',
            awardDate: row['Award Date'] ?? '',
            status: row['Status'] ?? 'active',
            createdAt: row['Created At'] ?? '',
            updatedAt: row['Updated At'] ?? ''
          }));
        }
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
      } else {
        const { data: reviewerData2, error: reviewerErr2 } = await supabaseAdmin
          .from('user_app')
          .select('"ID", "Name", "Email", "MattermostId", "GitHubIDs", "CVLink", "Expertise", "Status", "CreatedAt", "UpdatedAt", "Role"')
          .eq('Role', 'reviewer')
          .limit(1000);
        if (!reviewerErr2 && Array.isArray(reviewerData2)) {
          reviewers = reviewerData2.map((row: any) => ({
            id: row['ID'],
            userID: row['ID'],
            name: row['Name'] ?? '',
            email: row['Email'] ?? '',
            mattermostId: row['MattermostId'] ?? '',
            githubIds: row['GitHubIDs'] ?? '',
            cvLink: row['CVLink'] ?? '',
            expertise: row['Expertise'] ?? '',
            isAvailable: (String(row['Status'] || '').toLowerCase() !== 'inactive'),
            anonymousName: '',
            createdAt: row['CreatedAt'] ?? '',
            updatedAt: row['UpdatedAt'] ?? ''
          }));
        }
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
      } else {
        const { data: assignmentData2, error: assignErr2 } = await supabaseAdmin
          .from('team_reviewer_assignment')
          .select('"ID", "Team ID", "Reviewer ID", "Assigned By", "Assigned At", "Status", "Approved By", "Approved At", "Revoked By", "Revoked At", "Notes", "Created At", "Updated At"')
          .limit(1000);
        if (!assignErr2 && Array.isArray(assignmentData2)) {
          assignments = assignmentData2.map((row: any) => {
            const revIdNumeric = row['Reviewer ID'];
            let revIdText = revIdNumeric != null ? String(revIdNumeric) : '';
            if (revIdText) {
              const match = reviewers.find((r: any) => {
                const ridDigits = String(r.id || '').replace(/\D/g, '');
                const uidDigits = String(r.userID || '').replace(/\D/g, '');
                return ridDigits === revIdText || uidDigits === revIdText;
              });
              if (match && match.id) {
                revIdText = match.id;
              }
            }
            return {
              id: row['ID'],
              teamId: row['Team ID'] ?? '',
              reviewerId: revIdText,
              assignedBy: row['Assigned By'] ?? '',
              assignedAt: row['Assigned At'] ?? '',
              status: String(row['Status'] || '').toLowerCase() || 'pending',
              approvedBy: row['Approved By'] ?? undefined,
              approvedAt: row['Approved At'] ?? undefined,
              revokedBy: row['Revoked By'] ?? undefined,
              revokedAt: row['Revoked At'] ?? undefined,
              notes: row['Notes'] ?? undefined,
              createdAt: row['Created At'] ?? '',
              updatedAt: row['Updated At'] ?? ''
            };
          });
        }
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
    const body = await request.json();
    const { type } = body || {};

    if (!type) {
      return NextResponse.json(
        { success: false, message: 'Missing type in request body' },
        { status: 400 }
      );
    }

    // Helper to try a primary insert, then fall back to legacy table shape if needed
    const tryInsert = async (
      primary: { table: string; payload: any },
      fallback?: { table: string; payload: any }
    ) => {
      const { error: err1, data: data1 } = await supabaseAdmin
        .from(primary.table)
        .insert(primary.payload)
        .select('*')
        .limit(1);
      if (!err1 && data1 && data1[0]) return { data: data1[0] };
      if (fallback) {
        const { error: err2, data: data2 } = await supabaseAdmin
          .from(fallback.table)
          .insert(fallback.payload)
          .select('*')
          .limit(1);
        if (!err2 && data2 && data2[0]) return { data: data2[0] };
        return { error: err2 || err1 };
      }
      return { error: err1 };
    };

    if (type === 'team') {
      const { name, email, projectTitle, category, awardType, teamUsername, teamPassword, proposalId, teamLeaderName } = body || {};
      if (!name || !email || !teamUsername || !teamPassword) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields for team' },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      // 1) Insert minimal record into modern table (awarded_teams)
      let createdTeamId = teamId;
      {
        const modernInsert = await supabaseAdmin
          .from('awarded_teams')
          .insert({
            name,
            email,
            projectTitle: projectTitle || '',
            category: category || '',
            awardType: awardType || '',
            status: 'active',
            createdAt: now,
            updatedAt: now,
          })
          .select('*')
          .limit(1);

        if (!modernInsert.error && modernInsert.data && modernInsert.data[0]) {
          const row = modernInsert.data[0];
          createdTeamId = row?.id ?? createdTeamId;
          // Try to set optional fields on modern table if the columns exist
          try {
            if (row?.id) {
              await supabaseAdmin
                .from('awarded_teams')
                .update({ teamUsername, proposalId, teamLeaderName })
                .eq('id', row.id);
            }
          } catch (e) {
            console.warn('Optional update of awarded_teams fields failed (columns may not exist)');
          }
        } else {
          console.warn('Insert into awarded_teams failed; proceeding with legacy awarded_team only');
        }
      }

      // 2) Dual-write credentials into legacy table for authentication
      {
        const legacyInsert = await supabaseAdmin
          .from('awarded_team')
          .insert({
            'ID': createdTeamId,
            'Team Name': name,
            'Proposal ID': proposalId || '',
            'Proposal Title': projectTitle || '',
            'Team Leader Name': teamLeaderName || '',
            'Team Leader Email': email,
            'Team Username': teamUsername,
            'Team Password': teamPassword,
            'Status': 'active',
            'Created At': now,
            'Updated At': now,
          })
          .select('*')
          .limit(1);

        if (legacyInsert.error) {
          console.error('Supabase error inserting legacy team credentials:', legacyInsert.error);
          // If modern insert also failed, consider this a hard failure
          const modernExists = createdTeamId !== teamId; // id changed means modern insert succeeded
          if (!modernExists) {
            return NextResponse.json(
              { success: false, message: 'Failed to add team' },
              { status: 500 }
            );
          }
        }
      }

      return NextResponse.json({ success: true, data: { id: createdTeamId } });
    }

    if (type === 'reviewer') {
      const { name, email, mattermostId, githubIds, cvLink, expertise } = body || {};
      if (!name || !email) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields for reviewer' },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const reviewerIdGen = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const primaryPayload = {
        name,
        email,
        mattermostId: mattermostId || '',
        githubIds: githubIds || '',
        cvLink: cvLink || '',
        expertise: expertise || '',
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      };
      const fallbackPayload = {
        'ID': reviewerIdGen,
        'Name': name,
        'Email': email,
        'MattermostId': mattermostId || '',
        'GitHubIDs': githubIds || '',
        'CVLink': cvLink || '',
        'Expertise': expertise || '',
        'Status': 'available',
        'CreatedAt': now,
        'UpdatedAt': now,
        'Role': 'reviewer',
      };

      const result = await tryInsert(
        { table: 'reviewers', payload: primaryPayload },
        { table: 'user_app', payload: fallbackPayload }
      );
      if ((result as any).error) {
        console.error('Supabase error inserting reviewer:', (result as any).error);
        return NextResponse.json(
          { success: false, message: 'Failed to add reviewer' },
          { status: 500 }
        );
      }

      const row = (result as any).data;
      const reviewerId = row?.id ?? row?.ID ?? reviewerIdGen;
      return NextResponse.json({ success: true, data: { id: reviewerId } });
    }

    if (type === 'assignment') {
      const { teamId, reviewerId, adminId } = body || {};
      if (!teamId || !reviewerId) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields for assignment' },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const assignmentIdGen = `assign_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      // Legacy table expects bigint for "Reviewer ID"; coerce by extracting digits
      const reviewerIdDigits = String(reviewerId).replace(/\D/g, '');
      const reviewerIdBigInt = reviewerIdDigits ? parseInt(reviewerIdDigits, 10) : null;
      const primaryPayload = {
        teamId,
        reviewerId,
        status: 'active', // default to active to enable chat flows; can be revised via PUT
        assignedBy: adminId || 'system',
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      const fallbackPayload = {
        'ID': assignmentIdGen,
        'Team ID': teamId,
        'Reviewer ID': reviewerIdBigInt,
        'Status': 'active',
        'Assigned By': adminId || 'system',
        'Assigned At': now,
        'Created At': now,
        'Updated At': now,
      };

      const result = await tryInsert(
        { table: 'team_reviewer_assignments', payload: primaryPayload },
        { table: 'team_reviewer_assignment', payload: fallbackPayload }
      );
      if ((result as any).error) {
        console.error('Supabase error inserting assignment:', (result as any).error);
        return NextResponse.json(
          { success: false, message: 'Failed to create assignment' },
          { status: 500 }
        );
      }

      const row = (result as any).data;
      const assignmentId = row?.id ?? row?.ID ?? assignmentIdGen;
      return NextResponse.json({ success: true, data: { id: assignmentId } });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}