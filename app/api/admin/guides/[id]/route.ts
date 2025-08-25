// app/api/admin/guides/[id]/route.ts
import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

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

const getGuidesSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Guides'];
  if (!sheet) {
    throw new Error('Guides sheet not found');
  }
  return sheet;
};

// PUT - Update guide
export async function PUT(req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { title, description, content, order, isPublished, attachments } = body ?? {};

    const doc = await initializeGoogleSheets();
    const sheet = await getGuidesSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    const row = rows[rowIndex];
    const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });

    if (title !== undefined) row.set('title', title);
    if (description !== undefined) row.set('description', description);
    if (content !== undefined) row.set('content', content);
    if (order !== undefined) row.set('order', Number.isFinite(+order) ? String(+order) : '');
    if (isPublished !== undefined) row.set('isPublished', isPublished ? 'true' : 'false');

    if (attachments !== undefined) {
      const list = Array.isArray(attachments) ? attachments : [];
      const processed = list.map((att: any) => ({
        ...att,
        id: att?.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      }));
      row.set('attachments', JSON.stringify(processed));
    }

    row.set('updatedAt', now);
    await row.save();

    // Parse attachments for response
    let parsedAttachments: any[] = [];
    const aStr = row.get('attachments');
    if (aStr) {
      try { const parsed = JSON.parse(aStr); if (Array.isArray(parsed)) parsedAttachments = parsed; } catch {}
    }

    return NextResponse.json({
      message: 'Guide updated successfully',
      guide: {
        id: row.get('id'),
        title: row.get('title'),
        description: row.get('description'),
        content: row.get('content'),
        order: parseInt(row.get('order')) || 1,
        isPublished: row.get('isPublished') === 'true',
        attachments: parsedAttachments,
        createdAt: row.get('createdAt'),
        updatedAt: row.get('updatedAt'),
      }
    });
  } catch (error) {
    console.error('Error updating guide:', error);
    return NextResponse.json({ error: 'Failed to update guide' }, { status: 500 });
  }
}

// DELETE - Delete guide
export async function DELETE(_req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const doc = await initializeGoogleSheets();
    const sheet = await getGuidesSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    await rows[rowIndex].delete();
    return NextResponse.json({ message: 'Guide deleted successfully' });
  } catch (error) {
    console.error('Error deleting guide:', error);
    return NextResponse.json({ error: 'Failed to delete guide' }, { status: 500 });
  }
}
