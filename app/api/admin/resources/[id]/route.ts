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

// Get Resources sheet
const getResourcesSheet = async (doc: GoogleSpreadsheet) => {
  const sheet = doc.sheetsByTitle['Resources'];
  if (!sheet) {
    throw new Error('Resources sheet not found');
  }
  return sheet;
};

// PUT - Update resource
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, category, url, fileUrl, fileName } = body;

    const doc = await initializeGoogleSheets();
    const sheet = await getResourcesSheet(doc);
    
    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex(row => row.get('id') === id);
    
    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];
    const now = new Date().toISOString();
    
    // Update the row
    if (title !== undefined) row.set('title', title);
    if (description !== undefined) row.set('description', description);
    if (category !== undefined) row.set('category', category);
    if (url !== undefined) row.set('url', url || '');
    if (fileUrl !== undefined) row.set('fileUrl', fileUrl || '');
    if (fileName !== undefined) row.set('fileName', fileName || '');
    row.set('updatedAt', now);
    
    await row.save();

    return NextResponse.json({
      message: 'Resource updated successfully',
      resource: {
        id: row.get('id'),
        title: row.get('title'),
        description: row.get('description'),
        category: row.get('category'),
        url: row.get('url') || undefined,
        fileUrl: row.get('fileUrl') || undefined,
        fileName: row.get('fileName') || undefined,
        createdAt: row.get('createdAt'),
        updatedAt: row.get('updatedAt'),
      }
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    );
  }
}

// DELETE - Delete resource
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const doc = await initializeGoogleSheets();
    const sheet = await getResourcesSheet(doc);
    
    const rows = await sheet.getRows();
    const rowIndex = rows.findIndex(row => row.get('id') === id);
    
    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    const row = rows[rowIndex];
    await row.delete();

    return NextResponse.json({
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
}