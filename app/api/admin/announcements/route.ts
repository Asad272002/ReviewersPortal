import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Google Sheets Auth
const initializeGoogleSheets = async () => {
  if (
    !process.env.GOOGLE_SHEET_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
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

const getAnnouncementsSheet = async (doc: GoogleSpreadsheet) => {
  let sheet = doc.sheetsByTitle['Announcements'];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Announcements',
      headerValues: ['id', 'title', 'content', 'category', 'duration', 'expiresAt', 'createdAt', 'updatedAt'],
    });
  }
  return sheet;
};

// PUT - Update an existing announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, content, category, duration, expiresAt } = body;

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    const rows = await sheet.getRows();

    const row = rows.find(r => r.get('id') === id);
    if (!row) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
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
      },
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
