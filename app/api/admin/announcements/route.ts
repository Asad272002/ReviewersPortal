// app/api/admin/announcements/route.ts
import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { validateRequiredText, validateInput, sanitizeInput } from '../../../utils/validation';

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
    // Filter only general announcements to avoid duplicates with important updates
    const data = rows
      .filter((r: any) => r.get('category') === 'general')
      .map((r: any) => {
        const expiresAt = r.get('expiresAt') || undefined;
        const createdAt = r.get('createdAt');
        const status = r.get('status') || 'live'; // Read status from sheets
        
        return {
          id: r.get('id'),
          title: r.get('title'),
          content: r.get('content'),
          category: r.get('category'),
          status,
          duration: r.get('duration') ? parseInt(r.get('duration')) : undefined,
          expiresAt,
          createdAt,
          updatedAt: r.get('updatedAt'),
        };
      });
    return NextResponse.json({ announcements: data });
  } catch (e) {
    console.error('GET /announcements error:', e);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST /api/admin/announcements (create)
export async function POST(req: Request) {
  try {
    const { id, title, content, category, duration, expiresAt, status } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Validate against formula injection and invalid inputs
    const titleReq = validateRequiredText(title, 'Title', 1, 200);
    if (!titleReq.isValid) return NextResponse.json({ error: titleReq.error }, { status: 400 });
    const contentReq = validateRequiredText(content, 'Content', 1, 2000);
    if (!contentReq.isValid) return NextResponse.json({ error: contentReq.error }, { status: 400 });
    const titleInj = validateInput(title, 'Title');
    if (!titleInj.isValid) return NextResponse.json({ error: titleInj.error }, { status: 400 });
    const contentInj = validateInput(content, 'Content');
    if (!contentInj.isValid) return NextResponse.json({ error: contentInj.error }, { status: 400 });

    const safeTitle = sanitizeInput(title);
    const safeContent = sanitizeInput(content);

    const announcementId = id || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const doc = await initializeGoogleSheets();
    const sheet = await getAnnouncementsSheet(doc);

    const nowISO = new Date().toISOString();
    const allowedStatuses = ['live', 'expired', 'upcoming'];
    const finalStatus = allowedStatuses.includes(status) ? status : 'live';

    const expiresAtValue = expiresAt
      ? String(expiresAt)
      : duration
        ? new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000).toISOString()
        : '';

    await sheet.addRow({
      id: announcementId,
      title: safeTitle,
      content: safeContent,
      category,
      status: finalStatus,
      duration: duration?.toString() ?? '',
      expiresAt: expiresAtValue,
      createdAt: nowISO,
      updatedAt: nowISO,
    });

    return NextResponse.json({ message: 'Announcement created' }, { status: 201 });
  } catch (e) {
    console.error('POST /announcements error:', e);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
