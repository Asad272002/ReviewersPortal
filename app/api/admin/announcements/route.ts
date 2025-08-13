// app/api/admin/announcements/route.ts
import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export const runtime = 'nodejs';

const initializeGoogleSheets = async () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID!;
  const auth = new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const doc = new GoogleSpreadsheet(sheetId, auth);
  await doc.loadInfo();
  return doc;
};

const getAnnouncementsSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Announcements'];
  if (!sheet) throw new Error('Announcements sheet not found');
  return sheet;
};

// GET /api/admin/announcements (list)
export async function GET(_req: Request) {
  try {
    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    const rows = await sheet.getRows();
    const data = rows.map((r: any) => ({
      id: r.get('id'),
      title: r.get('title'),
      content: r.get('content'),
      category: r.get('category'),
      duration: r.get('duration') ? parseInt(r.get('duration')) : undefined,
      expiresAt: r.get('expiresAt') || undefined,
      createdAt: r.get('createdAt'),
      updatedAt: r.get('updatedAt'),
    }));
    return NextResponse.json(data);
  } catch (e) {
    console.error('GET /announcements error:', e);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST /api/admin/announcements (create)
export async function POST(req: Request) {
  try {
    const { id, title, content, category, duration, expiresAt } = await req.json();

    if (!id || !title) {
      return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
    }

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);
    const now = new Date().toISOString();

    await sheet.addRow({
      id,
      title,
      content,
      category,
      duration: duration?.toString() ?? '',
      expiresAt: expiresAt ?? '',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ message: 'Announcement created' }, { status: 201 });
  } catch (e) {
    console.error('POST /announcements error:', e);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
