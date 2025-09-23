import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { AwardedTeam, Reviewer, TeamReviewerAssignment } from '../../../types/awarded-teams';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, jwt);

export async function GET(request: NextRequest) {
  try {
    await doc.loadInfo();
    
    // Get awarded teams sheet
    let awardedTeamsSheet = doc.sheetsByTitle['Awarded Teams'];
    if (!awardedTeamsSheet) {
      awardedTeamsSheet = await doc.addSheet({
        title: 'Awarded Teams',
        headerValues: [
          'ID', 'Name', 'Description', 'Status', 'CreatedAt'
        ]
      });
    }

    // Get users sheet (we'll filter for reviewers)
    let usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      throw new Error('Users sheet not found');
    }

    // Get assignments sheet
    let assignmentsSheet = doc.sheetsByTitle['Team Reviewer Assignments'];
    if (!assignmentsSheet) {
      assignmentsSheet = await doc.addSheet({
        title: 'Team Reviewer Assignments',
        headerValues: [
          'ID', 'TeamID', 'ReviewerID', 'Status', 'AssignedAt', 'ApprovedAt', 'CompletedAt'
        ]
      });
    }

    const awardedTeamsRows = await awardedTeamsSheet.getRows();
    const usersRows = await usersSheet.getRows();
    const assignmentsRows = await assignmentsSheet.getRows();

    const awardedTeams: AwardedTeam[] = awardedTeamsRows.map(row => ({
      id: row.get('ID') || '',
      teamName: row.get('Team Name') || '',
      proposalId: row.get('Proposal ID') || '',
      proposalTitle: row.get('Proposal Title') || '',
      teamLeaderUsername: row.get('Team Leader Username') || '',
      teamLeaderEmail: row.get('Team Leader Email') || '',
      teamLeaderName: row.get('Team Leader Name') || '',
      awardDate: row.get('Award Date') || '',
      status: row.get('Status') || 'active',
      createdAt: row.get('Created At') || '',
      updatedAt: row.get('Updated At') || ''
    }));

    // Fetch reviewers from Reviewers sheet
    let reviewersSheet = doc.sheetsByTitle['Reviewers'];
    if (!reviewersSheet) {
      throw new Error('Reviewers sheet not found');
    }

    const reviewersRows = await reviewersSheet.getRows();
    const reviewers: Reviewer[] = reviewersRows.map(row => ({
      id: row.get('ID') || '',
      userID: row.get('UserID') || '',
      name: row.get('Name') || '',
      email: row.get('Email') || '',
      mattermostId: row.get('MattermostId') || '',
      githubIds: row.get('GitHubIDs') || '',
      cvLink: row.get('CVLink') || '',
      expertise: row.get('Expertise') || '',
      isAvailable: row.get('IsAvailable') === 'TRUE' || row.get('IsAvailable') === true,
      anonymousName: row.get('AnonymousName') || '',
      createdAt: row.get('CreatedAt') || new Date().toISOString(),
      updatedAt: row.get('UpdatedAt') || new Date().toISOString()
    }));

    const assignments: TeamReviewerAssignment[] = assignmentsRows.map(row => ({
      id: row.get('ID') || '',
      teamId: row.get('Team ID') || '',
      reviewerId: row.get('Reviewer ID') || '',
      assignedBy: row.get('Assigned By') || '',
      assignedAt: row.get('Assigned At') || '',
      status: row.get('Status') || 'pending',
      approvedBy: row.get('Approved By') || undefined,
      approvedAt: row.get('Approved At') || undefined,
      revokedBy: row.get('Revoked By') || undefined,
      revokedAt: row.get('Revoked At') || undefined,
      notes: row.get('Notes') || undefined,
      createdAt: row.get('Created At') || '',
      updatedAt: row.get('Updated At') || ''
    }));

    return NextResponse.json({
      success: true,
      data: {
        awardedTeams,
        reviewers,
        assignments
      }
    });

  } catch (error) {
    console.error('Error fetching awarded teams data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch awarded teams data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    await doc.loadInfo();

    if (type === 'create_team') {
      let awardedTeamsSheet = doc.sheetsByTitle['Awarded Teams'];
      if (!awardedTeamsSheet) {
        awardedTeamsSheet = await doc.addSheet({
          title: 'Awarded Teams',
          headerValues: [
            'ID', 'Team Name', 'Proposal ID', 'Proposal Title', 'Team Leader Email',
            'Team Leader Name', 'Award Date', 'Status', 'Created At', 'Updated At'
          ]
        });
      }

      const newTeam: AwardedTeam = {
        id: `TEAM-${Date.now()}`,
        teamName: data.teamName,
        teamLeaderUsername: data.teamLeaderUsername || data.teamLeaderEmail,
        proposalId: data.proposalId,
        proposalTitle: data.proposalTitle,
        teamLeaderEmail: data.teamLeaderEmail,
        teamLeaderName: data.teamLeaderName,
        awardDate: data.awardDate,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await awardedTeamsSheet.addRow({
        'ID': newTeam.id,
        'Name': newTeam.teamName,
        'Description': newTeam.proposalTitle,
        'Status': newTeam.status,
        'CreatedAt': newTeam.createdAt
      });

      return NextResponse.json({
        success: true,
        message: 'Awarded team created successfully',
        data: newTeam
      });
    }

    if (type === 'reviewer') {
      // Create reviewer
      const { userID, name, email, mattermostId, githubIds, cvLink, expertise } = data;
      
      if (!userID || !name || !email) {
        return NextResponse.json({ success: false, message: 'UserID, name, and email are required' }, { status: 400 });
      }

      // Check if Reviewers sheet exists, create if not
      let reviewersSheet = doc.sheetsByTitle['Reviewers'];
      if (!reviewersSheet) {
        reviewersSheet = await doc.addSheet({
          title: 'Reviewers',
          headerValues: ['ID', 'UserID', 'Name', 'Email', 'MattermostId', 'GitHubIDs', 'CVLink', 'Expertise', 'IsAvailable', 'AnonymousName', 'CreatedAt', 'UpdatedAt']
        });
      }

      // Generate unique ID for reviewer
      const reviewerId = `REV-${Date.now()}`;
      const anonymousName = `Review Circle Reviewer ${String.fromCharCode(65 + (await reviewersSheet.getRows()).length)}`;
      
      // Add new reviewer row
      await reviewersSheet.addRow({
        ID: reviewerId,
        UserID: userID,
        Name: name,
        Email: email,
        MattermostId: mattermostId || '',
        GitHubIDs: githubIds || '',
        CVLink: cvLink || '',
        Expertise: expertise || '',
        IsAvailable: 'TRUE',
        AnonymousName: anonymousName,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Reviewer added successfully',
        data: { reviewerId }
      });
    }

    if (type === 'assign_reviewer') {
      let assignmentsSheet = doc.sheetsByTitle['Team Reviewer Assignments'];
      if (!assignmentsSheet) {
        assignmentsSheet = await doc.addSheet({
          title: 'Team Reviewer Assignments',
          headerValues: [
            'ID', 'Team ID', 'Reviewer ID', 'Assigned By', 'Assigned At', 'Status',
            'Approved By', 'Approved At', 'Revoked By', 'Revoked At', 'Notes',
            'Created At', 'Updated At'
          ]
        });
      }

      const newAssignment: TeamReviewerAssignment = {
        id: `ASSIGN-${Date.now()}`,
        teamId: data.teamId,
        reviewerId: data.reviewerId,
        assignedBy: data.assignedBy,
        assignedAt: new Date().toISOString(),
        status: 'pending',
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await assignmentsSheet.addRow({
        'ID': newAssignment.id,
        'TeamID': newAssignment.teamId,
        'ReviewerID': newAssignment.reviewerId,
        'Status': newAssignment.status,
        'AssignedAt': newAssignment.assignedAt,
        'ApprovedAt': newAssignment.approvedAt || '',
        'CompletedAt': ''
      });

      return NextResponse.json({
        success: true,
        message: 'Reviewer assigned successfully',
        data: newAssignment
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid request type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error creating awarded teams data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create awarded teams data' },
      { status: 500 }
    );
  }
}