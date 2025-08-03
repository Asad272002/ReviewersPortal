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

// Get Announcements sheet
const getAnnouncementsSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Announcements'];
  if (!sheet) {
    throw new Error('Announcements sheet not found');
  }
  return sheet;
};

// PUT - Update announcement
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, content, category, duration, expiresAt } = body;

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    
    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex(row => row.get('id') === id);
    
    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];
    const now = new Date().toISOString();
    
    // Update the row
    if (title !== undefined) row.set('title', title);
    if (content !== undefined) row.set('content', content);
    if (category !== undefined) row.set('category', category);
    if (duration !== undefined) row.set('duration', duration?.toString() || '');
    if (expiresAt !== undefined) row.set('expiresAt', expiresAt || '');
    row.set('updatedAt', now);
    
    await row.save();

    return NextResponse.json({
      message: 'Announcement updated successfully',
      announcement: {
        id: row.get('id'),
        title: row.get('title'),
        content: row.get('content'),
        category: row.get('category'),
        duration: row.get('duration') ? parseInt(row.get('duration')) : undefined,
        expiresAt: row.get('expiresAt') || undefined,
        createdAt: row.get('createdAt'),
        updatedAt: row.get('updatedAt'),
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

// DELETE - Delete announcement
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    
    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex(row => row.get('id') === id);
    
    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];
    await row.delete();

    return NextResponse.json({
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}