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

// Get Guides sheet
const getGuidesSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Guides'];
  if (!sheet) {
    throw new Error('Guides sheet not found');
  }
  return sheet;
};

// PUT - Update guide
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, content, order, isPublished, attachments } = body;

    const doc = await initializeGoogleSheets();
    const sheet = await getGuidesSheet(doc);
    
    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex(row => row.get('id') === id);
    
    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];
    const now = new Date().toISOString();
    
    // Update the row
    if (title !== undefined) row.set('title', title);
    if (description !== undefined) row.set('description', description);
    if (content !== undefined) row.set('content', content);
    if (order !== undefined) row.set('order', order.toString());
    if (isPublished !== undefined) row.set('isPublished', isPublished ? 'true' : 'false');
    if (attachments !== undefined) {
      // Add unique IDs to new attachments that don't have them
      const processedAttachments = attachments.map((attachment: any) => ({
        ...attachment,
        id: attachment.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      row.set('attachments', JSON.stringify(processedAttachments));
    }
    row.set('updatedAt', now);
    
    await row.save();

    // Parse attachments for response
    let parsedAttachments = [];
    try {
      const attachmentsStr = row.get('attachments');
      if (attachmentsStr) {
        parsedAttachments = JSON.parse(attachmentsStr);
      }
    } catch (e) {
      console.warn('Failed to parse attachments for guide:', id);
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
    return NextResponse.json(
      { error: 'Failed to update guide' },
      { status: 500 }
    );
  }
}

// DELETE - Delete guide
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const doc = await initializeGoogleSheets();
    const sheet = await getGuidesSheet(doc);
    
    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex(row => row.get('id') === id);
    
    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];
    await row.delete();

    return NextResponse.json({
      message: 'Guide deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guide:', error);
    return NextResponse.json(
      { error: 'Failed to delete guide' },
      { status: 500 }
    );
  }
}