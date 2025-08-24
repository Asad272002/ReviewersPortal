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

// Get or create Resources sheet
const getResourcesSheet = async (doc: GoogleSpreadsheet) => {
  let sheet = doc.sheetsByTitle['Resources'];
  
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Resources',
      headerValues: ['id', 'title', 'description', 'category', 'url', 'fileUrl', 'fileName', 'createdAt', 'updatedAt']
    });
  }
  
  return sheet;
};

// GET - Fetch all resources
export async function GET() {
  try {
    const doc = await initializeGoogleSheets();
    const sheet = await getResourcesSheet(doc);
    
    const rows = await sheet.getRows();
    const resources = rows.map(row => ({
      id: row.get('id'),
      title: row.get('title'),
      description: row.get('description'),
      category: row.get('category'),
      url: row.get('url') || undefined,
      fileUrl: row.get('fileUrl') || undefined,
      fileName: row.get('fileName') || undefined,
      createdAt: row.get('createdAt'),
      updatedAt: row.get('updatedAt'),
    }));

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

// POST - Create new resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, url, fileUrl, fileName } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    const doc = await initializeGoogleSheets();
    const sheet = await getResourcesSheet(doc);
    
    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
    
    await sheet.addRow({
      id,
      title,
      description,
      category,
      url: url || '',
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      message: 'Resource created successfully',
      resource: {
        id,
        title,
        description,
        category,
        url,
        fileUrl,
        fileName,
        createdAt: now,
        updatedAt: now,
      }
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}