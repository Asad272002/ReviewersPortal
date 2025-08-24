import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export const runtime = 'nodejs';

// Initialize Google Sheets authentication
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

// Get Support Tickets sheet
const getSupportTicketsSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Support Tickets'];
  if (!sheet) throw new Error('Support Tickets sheet not found');
  return sheet;
};

// PUT - Update support ticket
export async function PUT(req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { status, priority, assignedTo, notes } = body ?? {};

    const doc = await initializeGoogleSheets();
    const sheet = await getSupportTicketsSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
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

    if (status !== undefined) row.set('status', status);
    if (priority !== undefined) row.set('priority', priority);
    if (assignedTo !== undefined) row.set('assignedTo', assignedTo || '');
    if (notes !== undefined) row.set('notes', notes || '');
    row.set('updatedAt', now);

    await row.save();

    return NextResponse.json({
      message: 'Support ticket updated successfully',
      ticket: {
        id: row.get('id'),
        name: row.get('name'),
        email: row.get('email'),
        category: row.get('category'),
        message: row.get('message'),
        status: row.get('status'),
        priority: row.get('priority'),
        assignedTo: row.get('assignedTo') || undefined,
        notes: row.get('notes') || undefined,
        createdAt: row.get('createdAt'),
        updatedAt: row.get('updatedAt'),
      },
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 });
  }
}

// DELETE - Delete support ticket
export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const doc = await initializeGoogleSheets();
    const sheet = await getSupportTicketsSheet(doc);

    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex((row: any) => row.get('id') === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    await rows[rowIndex].delete();
    return NextResponse.json({ message: 'Support ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    return NextResponse.json({ error: 'Failed to delete support ticket' }, { status: 500 });
  }
}
