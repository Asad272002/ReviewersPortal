import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// GET /api/admin/all-announcements (list all announcements for management)
export async function GET(_req: Request) {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['Announcements'];
    if (!sheet) {
      return NextResponse.json({ error: 'Announcements sheet not found' }, { status: 404 });
    }
    
    const rows = await sheet.getRows();
    
    // Return all announcements (both important and general) for management
    const data = rows.map((r: any) => {
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
    console.error('GET /all-announcements error:', e);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}