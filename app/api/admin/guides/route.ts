import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Initialize Google Sheets authentication
const initializeGoogleSheets = async () => {
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
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

// Get Guides sheet if it exists (no auto-create)
const getGuidesSheet = async (doc: GoogleSpreadsheet) => {
  return doc.sheetsByTitle['Guides'] ?? null;
};

// GET - Fetch all guides
export async function GET() {
  try {
    const doc = await initializeGoogleSheets();
    const sheet = await getGuidesSheet(doc);

    if (!sheet) {
      return NextResponse.json({ guides: [] });
    }
    
    const rows = await sheet.getRows();
    const guides = rows.map(row => {
      let attachments = [];
      try {
        const attachmentsStr = row.get('attachments');
        if (attachmentsStr) {
          attachments = JSON.parse(attachmentsStr);
        }
      } catch (e) {
        console.warn('Failed to parse attachments for guide:', row.get('id'));
      }
      
      return {
        id: row.get('id'),
        title: row.get('title'),
        description: row.get('description'),
        content: row.get('content'),
        order: parseInt(row.get('order')) || 1,
        isPublished: row.get('isPublished') === 'true',
        attachments,
        createdAt: row.get('createdAt'),
        updatedAt: row.get('updatedAt'),
      };
    });

    return NextResponse.json({ guides });
  } catch (error) {
    console.error('Error fetching guides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guides' },
      { status: 500 }
    );
  }
}

// POST - Create new guide
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, content, order, isPublished, attachments } = body;

    if (!title || !description || !content) {
      return NextResponse.json(
        { error: 'Title, description, and content are required' },
        { status: 400 }
      );
    }

    const doc = await initializeGoogleSheets();
    const sheet = await getGuidesSheet(doc);

    if (!sheet) {
      return NextResponse.json({ error: 'Guides sheet not found' }, { status: 404 });
    }
    
    const id = `guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
    
    // Add unique IDs to attachments
    const processedAttachments = (attachments || []).map((attachment: any) => ({
      ...attachment,
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    
    await sheet.addRow({
      id,
      title,
      description,
      content,
      order: order?.toString() || '1',
      isPublished: isPublished ? 'true' : 'false',
      attachments: JSON.stringify(processedAttachments),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: 'Guide created successfully',
      guide: {
        id,
        title,
        description,
        content,
        order: order || 1,
        isPublished: isPublished || false,
        attachments: processedAttachments,
        createdAt: now,
        updatedAt: now,
      }
    });
  } catch (error) {
    console.error('Error creating guide:', error);
    return NextResponse.json(
      { error: 'Failed to create guide' },
      { status: 500 }
    );
  }
}