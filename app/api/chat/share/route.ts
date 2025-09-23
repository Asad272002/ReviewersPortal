import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, jwt);

// POST - Generate a shareable chat link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, adminId } = body;

    if (!assignmentId || !adminId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await doc.loadInfo();
    
    // Verify assignment exists and is approved
    let assignmentsSheet = doc.sheetsByTitle['TeamReviewerAssignments'];
    if (!assignmentsSheet) {
      return NextResponse.json(
        { success: false, message: 'Assignments sheet not found' },
        { status: 404 }
      );
    }

    const assignmentRows = await assignmentsSheet.getRows();
    const assignment = assignmentRows.find(row => row.get('ID') === assignmentId);
    
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: 'Assignment not found' },
        { status: 404 }
      );
    }

    if (assignment.get('Status') !== 'approved' && assignment.get('Status') !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Assignment must be approved to generate chat link' },
        { status: 400 }
      );
    }

    // Check if chat session already exists
    let sessionsSheet = doc.sheetsByTitle['ChatSessions'];
    if (!sessionsSheet) {
      sessionsSheet = await doc.addSheet({
        title: 'ChatSessions',
        headerValues: [
          'SessionID', 'AssignmentID', 'TeamID', 'ReviewerID', 'ShareToken', 
          'Status', 'CreatedAt', 'LastActivity', 'ExpiresAt'
        ]
      });
    }

    const sessionRows = await sessionsSheet.getRows();
    let existingSession = sessionRows.find(row => row.get('AssignmentID') === assignmentId);
    
    let shareToken;
    let sessionId;
    
    if (existingSession && existingSession.get('Status') === 'active') {
      // Use existing session
      shareToken = existingSession.get('ShareToken');
      sessionId = existingSession.get('SessionID');
    } else {
      // Create new session
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      
      const currentTime = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      
      await sessionsSheet.addRow({
        'SessionID': sessionId,
        'AssignmentID': assignmentId,
        'TeamID': assignment.get('TeamID'),
        'ReviewerID': assignment.get('ReviewerID'),
        'ShareToken': shareToken,
        'Status': 'active',
        'CreatedAt': currentTime,
        'LastActivity': currentTime,
        'ExpiresAt': expiresAt
      });
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/chat/shared/${shareToken}`;

    return NextResponse.json({
      success: true,
      message: 'Shareable chat link generated successfully',
      data: {
        sessionId,
        shareToken,
        shareUrl,
        assignmentId,
        teamId: assignment.get('TeamID'),
        reviewerId: assignment.get('ReviewerID')
      }
    });

  } catch (error) {
    console.error('Error generating shareable chat link:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate shareable chat link' },
      { status: 500 }
    );
  }
}

// GET - Validate a share token and get session info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('token');

    if (!shareToken) {
      return NextResponse.json(
        { success: false, message: 'Share token is required' },
        { status: 400 }
      );
    }

    await doc.loadInfo();
    
    let sessionsSheet = doc.sheetsByTitle['ChatSessions'];
    if (!sessionsSheet) {
      return NextResponse.json(
        { success: false, message: 'Chat sessions not found' },
        { status: 404 }
      );
    }

    const sessionRows = await sessionsSheet.getRows();
    const session = sessionRows.find(row => row.get('ShareToken') === shareToken);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid share token' },
        { status: 404 }
      );
    }

    // Check if session is expired
    const expiresAt = new Date(session.get('ExpiresAt'));
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: 'Share link has expired' },
        { status: 410 }
      );
    }

    if (session.get('Status') !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Chat session is not active' },
        { status: 403 }
      );
    }

    // Get team and reviewer info
    let teamsSheet = doc.sheetsByTitle['AwardedTeams'];
    let reviewersSheet = doc.sheetsByTitle['Reviewers'];
    
    let teamInfo = null;
    let reviewerInfo = null;
    
    if (teamsSheet) {
      const teamRows = await teamsSheet.getRows();
      const team = teamRows.find(row => row.get('ID') === session.get('TeamID'));
      if (team) {
        teamInfo = {
          id: team.get('ID'),
          name: team.get('Name'),
          description: team.get('Description')
        };
      }
    }
    
    if (reviewersSheet) {
      const reviewerRows = await reviewersSheet.getRows();
      const reviewer = reviewerRows.find(row => row.get('ID') === session.get('ReviewerID'));
      if (reviewer) {
        reviewerInfo = {
          id: reviewer.get('ID'),
          name: 'Review Circle Reviewer', // Always anonymized
          email: reviewer.get('Email')
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.get('SessionID'),
        assignmentId: session.get('AssignmentID'),
        teamId: session.get('TeamID'),
        reviewerId: session.get('ReviewerID'),
        status: session.get('Status'),
        createdAt: session.get('CreatedAt'),
        expiresAt: session.get('ExpiresAt'),
        teamInfo,
        reviewerInfo
      }
    });

  } catch (error) {
    console.error('Error validating share token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to validate share token' },
      { status: 500 }
    );
  }
}