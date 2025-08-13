import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Ensure Node.js runtime (google-* needs Node APIs)
export const runtime = 'nodejs';

const initializeGoogleSheets = async () => {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (!SHEET_ID || !EMAIL || !KEY) {
    throw new Error('Google Sheets environment variables not configured');
  }

  const serviceAccountAuth = new JWT({
    email: EMAIL,
    key: KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
};

const getAnnouncementsSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Announcements'];
  if (!sheet) throw new Error('Announcements sheet not found');
  return sheet;
};

// PUT /api/admin/announcements/:id
export async function PUT(req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { title, content, category, duration, expiresAt } = body ?? {};

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const row = rows[rowIndex];
    const now = new Date().toISOString();

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
      },
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

// DELETE /api/admin/announcements/:id
export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await rows[rowIndex].delete();
    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
