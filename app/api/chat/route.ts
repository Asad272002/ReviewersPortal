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

// GET - Fetch chat messages for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!sessionId || !userId || !userRole) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    await doc.loadInfo();
    
    // Check if user has access to this chat session
    let sessionsSheet = doc.sheetsByTitle['Chat Sessions'];
    if (!sessionsSheet) {
      return NextResponse.json(
        { success: false, message: 'Chat sessions sheet not found' },
        { status: 404 }
      );
    }

    const sessionRows = await sessionsSheet.getRows();
    const session = sessionRows.find(row => row.get('Session ID') === sessionId);
    
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

    // Fetch chat messages
    let messagesSheet = doc.sheetsByTitle['Chat Messages'];
    if (!messagesSheet) {
      return NextResponse.json(
        { success: false, message: 'Chat messages sheet not found' },
        { status: 404 }
      );
    }

    const messageRows = await messagesSheet.getRows();
    const messages = messageRows
      .filter(row => row.get('Session ID') === sessionId)
      .map(row => ({
        id: row.get('Message ID'),
        sessionId: row.get('Session ID'),
        senderId: row.get('Sender ID'),
        senderType: row.get('Sender Type'),
        senderName: row.get('Sender Name'),
        message: row.get('Message'),
        messageType: row.get('Message Type'),
        fileUrl: row.get('File URL'),
        fileName: row.get('File Name'),
        timestamp: row.get('Timestamp'),
        isRead: row.get('Is Read') === 'TRUE'
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.get('Session ID'),
          teamId: session.get('Team ID'),
          reviewerId: session.get('Reviewer ID'),
          status: session.get('Status'),
          createdAt: session.get('Created At')
        },
        messages
      }
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

// POST - Send a new chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, senderId, senderType, message, messageType = 'text', fileUrl, fileName } = body;

    if (!sessionId || !senderId || !senderType || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await doc.loadInfo();
    
    // Verify session exists and is active
    let sessionsSheet = doc.sheetsByTitle['Chat Sessions'];
    if (!sessionsSheet) {
      return NextResponse.json(
        { success: false, message: 'Chat sessions sheet not found' },
        { status: 404 }
      );
    }

    const sessionRows = await sessionsSheet.getRows();
    const session = sessionRows.find(row => row.get('Session ID') === sessionId);
    
    if (!session || session.get('Status') !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Chat session not found or inactive' },
        { status: 404 }
      );
    }

    // Add message to sheet
    let messagesSheet = doc.sheetsByTitle['Chat Messages'];
    if (!messagesSheet) {
      // Create messages sheet if it doesn't exist
      messagesSheet = await doc.addSheet({
        title: 'Chat Messages',
        headerValues: [
          'Message ID', 'Session ID', 'Sender ID', 'Sender Type', 'Sender Name',
          'Message', 'Message Type', 'File URL', 'File Name', 'Timestamp', 'Is Read'
        ]
      });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Determine sender name based on type
    let senderName = 'Unknown';
    if (senderType === 'team') {
      senderName = `Team ${senderId}`;
    } else if (senderType === 'reviewer') {
      senderName = 'Review Circle Reviewer';
    } else if (senderType === 'admin') {
      senderName = 'Administrator';
    }

    await messagesSheet.addRow({
      'Message ID': messageId,
      'Session ID': sessionId,
      'Sender ID': senderId,
      'Sender Type': senderType,
      'Sender Name': senderName,
      'Message': message,
      'Message Type': messageType,
      'File URL': fileUrl || '',
      'File Name': fileName || '',
      'Timestamp': timestamp,
      'Is Read': 'FALSE'
    });

    // Update session last activity
    session.set('Last Activity', timestamp);
    await session.save();

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId,
        timestamp,
        senderName
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send message' },
      { status: 500 }
    );
  }
}