// app/api/admin/guides/[id]/attachments/[attachmentId]/route.ts
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

  const auth = new JWT({
    email: EMAIL,
    key: KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, auth);
  await doc.loadInfo();
  return doc;
};

const getGuidesSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Guides'];
  if (!sheet) throw new Error('Guides sheet not found');
  return sheet;
};

// DELETE - Remove attachment from guide
export async function DELETE(_req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id, attachmentId } =
      (params ?? {}) as { id?: string; attachmentId?: string };

    if (!id || !attachmentId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const doc = await initializeGoogleSheets();
    const sheet = await getGuidesSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    const row = rows[rowIndex];

    // Parse current attachments (robust)
    let attachments: any[] = [];
    const attachmentsStr = row.get('attachments');
    if (attachmentsStr) {
      try {
        const parsed = JSON.parse(attachmentsStr);
        if (Array.isArray(parsed)) attachments = parsed;
      } catch {
        console.warn('Failed to parse attachments for guide:', id);
        return NextResponse.json(
          { error: 'Failed to parse guide attachments' },
          { status: 500 }
        );
      }
    }

    const updated = attachments.filter((att) => att?.id !== attachmentId);
    if (updated.length === attachments.length) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    row.set('attachments', JSON.stringify(updated));
    row.set('updatedAt', new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  }));
    await row.save();

    return NextResponse.json({ message: 'Attachment removed successfully' });
  } catch (error) {
    console.error('Error removing attachment:', error);
    return NextResponse.json({ error: 'Failed to remove attachment' }, { status: 500 });
  }
}
