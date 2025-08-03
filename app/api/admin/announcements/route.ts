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

// Get or create Announcements sheet
const getAnnouncementsSheet = async (doc: GoogleSpreadsheet) => {
  let sheet = doc.sheetsByTitle['Announcements'];
  
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Announcements',
      headerValues: ['id', 'title', 'content', 'category', 'duration', 'expiresAt', 'createdAt', 'updatedAt']
    });
  }
  
  return sheet;
};

// GET - Fetch all announcements
export async function GET() {
  try {
    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    
    const rows = await sheet.getRows();
    const announcements = rows.map(row => ({
      id: row.get('id'),
      title: row.get('title'),
      content: row.get('content'),
      category: row.get('category'),
      duration: row.get('duration') ? parseInt(row.get('duration')) : undefined,
      expiresAt: row.get('expiresAt') || undefined,
      createdAt: row.get('createdAt'),
      updatedAt: row.get('updatedAt'),
    }));

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST - Create new announcement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category, duration, expiresAt } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await sheet.addRow({
      id,
      title,
      content,
      category,
      duration: duration?.toString() || '',
      expiresAt: expiresAt || '',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: 'Announcement created successfully',
      announcement: {
        id,
        title,
        content,
        category,
        duration,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      }
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing announcement
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update an existing announcement
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { title, content, category, duration, expiresAt } = body;

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    const rows = await sheet.getRows();

    const row = rows.find(r => r.get('id') === id);
    if (!row) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    if (title !== undefined) row.set('title', title);
    if (content !== undefined) row.set('content', content);
    if (category !== undefined) row.set('category', category);
    if (duration !== undefined) row.set('duration', duration.toString());
    if (expiresAt !== undefined) row.set('expiresAt', expiresAt);

    row.set('updatedAt', new Date().toISOString());
    await row.save();

    return NextResponse.json({
      message: 'Announcement updated successfully',
      announcement: {
        id,
        title,
        content,
        category,
        duration,
        expiresAt,
        updatedAt: row.get('updatedAt'),
        createdAt: row.get('createdAt'),
      }
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}
