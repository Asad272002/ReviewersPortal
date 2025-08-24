import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Initialize Google Sheets authentication
const initializeGoogleSheets = async () => {
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Sheets environment variables not configured');
  }

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  
  return doc;
};

// Get or create Support Tickets sheet
const getSupportTicketsSheet = async (doc: GoogleSpreadsheet) => {
  let sheet = doc.sheetsByTitle['Support Tickets'];
  
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Support Tickets',
      headerValues: ['id', 'name', 'email', 'category', 'message', 'status', 'priority', 'assignedTo', 'notes', 'createdAt', 'updatedAt']
    });
  }
  
  return sheet;
};

// GET - Fetch all support tickets
export async function GET() {
  try {
    const doc = await initializeGoogleSheets();
    const sheet = await getSupportTicketsSheet(doc);
    
    const rows = await sheet.getRows();
    const tickets = rows.map(row => ({
      id: row.get('id'),
      name: row.get('name'),
      email: row.get('email'),
      category: row.get('category'),
      message: row.get('message'),
      status: row.get('status') || 'open',
      priority: row.get('priority') || 'medium',
      assignedTo: row.get('assignedTo') || undefined,
      notes: row.get('notes') || undefined,
      createdAt: row.get('createdAt'),
      updatedAt: row.get('updatedAt'),
    }));

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}

// POST - Create new support ticket (from support form)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, category, message } = body;

    if (!name || !email || !category || !message) {
      return NextResponse.json(
        { error: 'Name, email, category, and message are required' },
        { status: 400 }
      );
    }

    const doc = await initializeGoogleSheets();
    const sheet = await getSupportTicketsSheet(doc);
    
    const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
    
    await sheet.addRow({
      id,
      name,
      email,
      category,
      message,
      status: 'open',
      priority: 'medium',
      assignedTo: '',
      notes: '',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticket: {
        id,
        name,
        email,
        category,
        message,
        status: 'open',
        priority: 'medium',
        createdAt: now,
        updatedAt: now,
      }
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}