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

// GET - Fetch specific chat session details
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
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
      return NextResponse.json(
        { success: false, message: 'Chat sessions sheet not found' },
        { status: 404 }
      );
    }

    const rows = await sessionsSheet.getRows();
    const session = rows.find(row => row.get('Session ID') === id);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Verify user access
    const teamId = session.get('Team ID');
    const reviewerId = session.get('Reviewer ID');
    
    if (userRole === 'user' && teamId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
    
    if (userRole === 'reviewer' && reviewerId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const sessionData = {
      id: session.get('Session ID'),
      teamId: session.get('Team ID'),
      reviewerId: session.get('Reviewer ID'),
      assignmentId: session.get('Assignment ID'),
      status: session.get('Status'),
      createdAt: session.get('Created At'),
      lastActivity: session.get('Last Activity'),
      createdBy: session.get('Created By'),
      endedAt: session.get('Ended At'),
      endedBy: session.get('Ended By')
    };

    return NextResponse.json({
      success: true,
      data: sessionData
    });

  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch chat session' },
      { status: 500 }
    );
  }
}

// PUT - Update chat session (end session, change status)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, userId, userRole } = body;

    if (!action || !userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await doc.loadInfo();
    
    let sessionsSheet = doc.sheetsByTitle['Chat Sessions'];
    if (!sessionsSheet) {
      return NextResponse.json(
        { success: false, message: 'Chat sessions sheet not found' },
        { status: 404 }
      );
    }

    const rows = await sessionsSheet.getRows();
    const sessionRow = rows.find(row => row.get('Session ID') === id);
    
    if (!sessionRow) {
      return NextResponse.json(
        { success: false, message: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Verify user access for session modification
    const teamId = sessionRow.get('Team ID');
    const reviewerId = sessionRow.get('Reviewer ID');
    
    if (userRole === 'user' && teamId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
    
    if (userRole === 'reviewer' && reviewerId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const currentTime = new Date().toISOString();

    switch (action) {
      case 'end':
        sessionRow.set('Status', 'ended');
        sessionRow.set('Ended At', currentTime);
        sessionRow.set('Ended By', userId);
        sessionRow.set('Last Activity', currentTime);
        break;

      case 'pause':
        sessionRow.set('Status', 'paused');
        sessionRow.set('Last Activity', currentTime);
        break;

      case 'resume':
        if (sessionRow.get('Status') !== 'paused') {
          return NextResponse.json(
            { success: false, message: 'Session is not paused' },
            { status: 400 }
          );
        }
        sessionRow.set('Status', 'active');
        sessionRow.set('Last Activity', currentTime);
        break;

      case 'update_activity':
        sessionRow.set('Last Activity', currentTime);
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    await sessionRow.save();

    return NextResponse.json({
      success: true,
      message: `Session ${action}ed successfully`,
      data: {
        id: sessionRow.get('Session ID'),
        status: sessionRow.get('Status'),
        lastActivity: sessionRow.get('Last Activity'),
        endedAt: sessionRow.get('Ended At'),
        endedBy: sessionRow.get('Ended By')
      }
    });

  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update chat session' },
      { status: 500 }
    );
  }
}

// DELETE - Delete chat session (admin only)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');

    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    await doc.loadInfo();
    
    let sessionsSheet = doc.sheetsByTitle['Chat Sessions'];
    if (!sessionsSheet) {
      return NextResponse.json(
        { success: false, message: 'Chat sessions sheet not found' },
        { status: 404 }
      );
    }

    const rows = await sessionsSheet.getRows();
    const sessionRow = rows.find(row => row.get('Session ID') === id);
    
    if (!sessionRow) {
      return NextResponse.json(
        { success: false, message: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Also delete associated messages
    let messagesSheet = doc.sheetsByTitle['Chat Messages'];
    if (messagesSheet) {
      const messageRows = await messagesSheet.getRows();
      const sessionMessages = messageRows.filter(row => row.get('Session ID') === id);
      
      for (const messageRow of sessionMessages) {
        await messageRow.delete();
      }
    }

    await sessionRow.delete();

    return NextResponse.json({
      success: true,
      message: 'Chat session and associated messages deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete chat session' },
      { status: 500 }
    );
  }
}