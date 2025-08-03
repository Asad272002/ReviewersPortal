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
    
    const sheet = doc.sheetsByTitle['Important Updates'];
    if (!sheet) {
      return NextResponse.json({ error: 'Important Updates sheet not found' }, { status: 404 });
    }
    
    const rows = await sheet.getRows();
    
    const importantUpdates = rows.map(row => ({
      id: row.get('id'),
      title: row.get('title'),
      content: row.get('content'),
      category: row.get('category'),
      duration: row.get('duration') ? parseInt(row.get('duration')) : null,
      expiresAt: row.get('expiresAt'),
      createdAt: row.get('createdAt'),
      updatedAt: row.get('updatedAt')
    }));
    
    return NextResponse.json(importantUpdates);
  } catch (error) {
    console.error('Error fetching important updates:', error);
    return NextResponse.json({ error: 'Failed to fetch important updates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category, duration, expiresAt } = body;
    
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['Important Updates'];
    if (!sheet) {
      return NextResponse.json({ error: 'Important Updates sheet not found' }, { status: 404 });
    }
    
    const rows = await sheet.getRows();
    const newId = (rows.length + 1).toString();
    
    await sheet.addRow({
      id: newId,
      title,
      content,
      category: category || 'important',
      duration: duration?.toString() || '',
      expiresAt: expiresAt || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({ message: 'Important update created successfully', id: newId });
  } catch (error) {
    console.error('Error creating important update:', error);
    return NextResponse.json({ error: 'Failed to create important update' }, { status: 500 });
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
    
    const sheet = doc.sheetsByTitle['Important Updates'];
    if (!sheet) {
      return NextResponse.json({ error: 'Important Updates sheet not found' }, { status: 404 });
    }
    
    const rows = await sheet.getRows();
    const rowToDelete = rows.find(row => row.get('id') === id);
    
    if (!rowToDelete) {
      return NextResponse.json({ error: 'Important update not found' }, { status: 404 });
    }
    
    await rowToDelete.delete();
    
    return NextResponse.json({ message: 'Important update deleted successfully' });
  } catch (error) {
    console.error('Error deleting important update:', error);
    return NextResponse.json({ error: 'Failed to delete important update' }, { status: 500 });
  }
}