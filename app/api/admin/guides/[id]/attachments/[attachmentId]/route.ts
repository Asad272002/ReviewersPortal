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

// DELETE - Remove attachment from guide
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const { id, attachmentId } = params;

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
    
    // Parse current attachments
    let attachments = [];
    try {
      const attachmentsStr = row.get('attachments');
      if (attachmentsStr) {
        attachments = JSON.parse(attachmentsStr);
      }
    } catch (e) {
      console.warn('Failed to parse attachments for guide:', id);
      return NextResponse.json(
        { error: 'Failed to parse guide attachments' },
        { status: 500 }
      );
    }
    
    // Remove the specific attachment
    const updatedAttachments = attachments.filter((att: any) => att.id !== attachmentId);
    
    if (updatedAttachments.length === attachments.length) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }
    
    // Update the row
    row.set('attachments', JSON.stringify(updatedAttachments));
    row.set('updatedAt', new Date().toISOString());
    
    await row.save();

    return NextResponse.json({
      message: 'Attachment removed successfully'
    });
  } catch (error) {
    console.error('Error removing attachment:', error);
    return NextResponse.json(
      { error: 'Failed to remove attachment' },
      { status: 500 }
    );
  }
}