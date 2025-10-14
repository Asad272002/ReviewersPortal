import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { validateRequiredText, validateInput, sanitizeInput } from '../../../../utils/validation';

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
    const params = await context?.params;
    const { id } = (params ?? {}) as { id: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { title, content, category, status, duration, expiresAt } = body ?? {};

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const row = rows[rowIndex];
    const nowISO = new Date().toISOString();

    if (title !== undefined) {
      const titleReq = validateRequiredText(title, 'Title', 1, 200);
      if (!titleReq.isValid) return NextResponse.json({ error: titleReq.error }, { status: 400 });
      const titleInj = validateInput(title, 'Title');
      if (!titleInj.isValid) return NextResponse.json({ error: titleInj.error }, { status: 400 });
      row.set('title', sanitizeInput(title));
    }
    if (content !== undefined) {
      const contentReq = validateRequiredText(content, 'Content', 1, 2000);
      if (!contentReq.isValid) return NextResponse.json({ error: contentReq.error }, { status: 400 });
      const contentInj = validateInput(content, 'Content');
      if (!contentInj.isValid) return NextResponse.json({ error: contentInj.error }, { status: 400 });
      row.set('content', sanitizeInput(content));
    }
    if (category !== undefined) row.set('category', category);
    if (status !== undefined) {
      const allowedStatuses = ['live', 'expired', 'upcoming'];
      row.set('status', allowedStatuses.includes(status) ? status : row.get('status') || 'live');
    }
    if (duration !== undefined) row.set('duration', duration?.toString() || '');
    if (expiresAt !== undefined) row.set('expiresAt', expiresAt || '');
    row.set('updatedAt', nowISO);

    await row.save();

    return NextResponse.json({
      message: 'Announcement updated successfully',
      announcement: {
        id: row.get('id'),
        title: row.get('title'),
        content: row.get('content'),
        category: row.get('category'),
        status: row.get('status') || 'live',
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
