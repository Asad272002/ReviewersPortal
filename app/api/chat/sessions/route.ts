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

// GET - Fetch chat sessions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    await doc.loadInfo();
    
    let sessionsSheet = doc.sheetsByTitle['Chat Sessions'];
    if (!sessionsSheet) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const rows = await sessionsSheet.getRows();
    let userSessions: any[] = [];

    if (userRole === 'user' || userRole === 'team') {
      userSessions = rows.filter(row => row.get('Team ID') === userId);
    } else if (userRole === 'reviewer') {
      userSessions = rows.filter(row => row.get('Reviewer ID') === userId);
    } else if (userRole === 'admin') {
      userSessions = rows; // Admin can see all sessions
    }

    const sessions = userSessions.map(row => ({
      id: row.get('Session ID'),
      teamId: row.get('Team ID'),
      reviewerId: row.get('Reviewer ID'),
      assignmentId: row.get('Assignment ID'),
      status: row.get('Status'),
      createdAt: row.get('Created At'),
      lastActivity: row.get('Last Activity'),
      createdBy: row.get('Created By')
    }));

    return NextResponse.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

// POST - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, assignmentId, createdBy } = body;

    if (!teamId || !assignmentId || !createdBy) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await doc.loadInfo();
    
    // Verify assignment exists and is active
    let assignmentsSheet = doc.sheetsByTitle['Team Reviewer Assignments'];
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

    if (assignment.get('Status') !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Assignment is not active' },
        { status: 400 }
      );
    }

    if (assignment.get('Team ID') !== teamId) {
      return NextResponse.json(
        { success: false, message: 'Team ID mismatch' },
        { status: 400 }
      );
    }

    // Check if session already exists for this assignment
    let sessionsSheet = doc.sheetsByTitle['Chat Sessions'];
    if (!sessionsSheet) {
      // Create sessions sheet if it doesn't exist
      sessionsSheet = await doc.addSheet({
        title: 'Chat Sessions',
        headerValues: [
          'Session ID', 'Team ID', 'Reviewer ID', 'Assignment ID', 'Status',
          'Created At', 'Last Activity', 'Created By', 'Ended At', 'Ended By'
        ]
      });
    }

    const existingRows = await sessionsSheet.getRows();
    const existingSession = existingRows.find(row => 
      row.get('Assignment ID') === assignmentId && 
      row.get('Status') === 'active'
    );

    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: 'Session already exists',
        data: {
          sessionId: existingSession.get('Session ID'),
          status: 'existing'
        }
      });
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentTime = new Date().toISOString();
    const reviewerId = assignment.get('Reviewer ID');

    await sessionsSheet.addRow({
      'Session ID': sessionId,
      'Team ID': teamId,
      'Reviewer ID': reviewerId,
      'Assignment ID': assignmentId,
      'Status': 'active',
      'Created At': currentTime,
      'Last Activity': currentTime,
      'Created By': createdBy,
      'Ended At': '',
      'Ended By': ''
    });

    return NextResponse.json({
      success: true,
      message: 'Chat session created successfully',
      data: {
        sessionId,
        teamId,
        reviewerId,
        assignmentId,
        status: 'active',
        createdAt: currentTime
      }
    });

  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}