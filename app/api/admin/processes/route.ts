import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function GET() {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['Processes'];
    if (!sheet) {
      return NextResponse.json({ error: 'Processes sheet not found' }, { status: 404 });
    }
    
    const rows = await sheet.getRows();
    
    const processes = rows.map(row => ({
      id: row.get('id'),
      title: row.get('title'),
      description: row.get('description'),
      content: row.get('content'),
      category: row.get('category'),
      order: row.get('order') ? parseInt(row.get('order')) : null,
      isPublished: row.get('isPublished')?.toLowerCase() === 'true',
      attachments: row.get('attachments') ? row.get('attachments').split(',').map((url: string) => url.trim()).filter((url: string) => url) : [],
      createdAt: row.get('createdAt'),
      updatedAt: row.get('updatedAt')
    }));
    
    return NextResponse.json(processes);
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json({ error: 'Failed to fetch processes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, content, category, order, isPublished, attachments } = body;
    
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['Processes'];
    if (!sheet) {
      return NextResponse.json({ error: 'Processes sheet not found' }, { status: 404 });
    }
    
    const rows = await sheet.getRows();
    const newId = (rows.length + 1).toString();
    
    await sheet.addRow({
      id: newId,
      title,
      description,
      content,
      category: category || 'general',
      order: order?.toString() || '',
      isPublished: isPublished ? 'true' : 'false',
      attachments: Array.isArray(attachments) ? attachments.join(', ') : (attachments || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({ message: 'Process created successfully', id: newId });
  } catch (error) {
    console.error('Error creating process:', error);
    return NextResponse.json({ error: 'Failed to create process' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['Processes'];
    if (!sheet) {
      return NextResponse.json({ error: 'Processes sheet not found' }, { status: 404 });
    }
    
    const rows = await sheet.getRows();
    const rowToDelete = rows.find(row => row.get('id') === id);
    
    if (!rowToDelete) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }
    
    await rowToDelete.delete();
    
    return NextResponse.json({ message: 'Process deleted successfully' });
  } catch (error) {
    console.error('Error deleting process:', error);
    return NextResponse.json({ error: 'Failed to delete process' }, { status: 500 });
  }
}