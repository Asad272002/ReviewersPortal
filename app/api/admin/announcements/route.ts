import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Initialize Google Sheets
const initializeGoogleSheets = async () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !sheetId) {
    throw new Error('Missing Google Sheets credentials.');
  }

  const auth = new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const doc = new GoogleSpreadsheet(sheetId, auth);
  await doc.loadInfo();
  return doc;
};

const getAnnouncementsSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Announcements'];
  if (!sheet) throw new Error('Announcements sheet not found.');
  return sheet;
};

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const data = await request.json();

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    const rows = await sheet.getRows();

    const row = rows.find(r => r.get('id') === id);
    if (!row) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const { title, content, category, duration, expiresAt } = data;

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
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
