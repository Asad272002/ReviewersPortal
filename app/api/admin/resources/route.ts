import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { validateRequiredText, validateUrl, sanitizeInput } from '../../../utils/validation';
export const runtime = 'nodejs';

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
  const expectedHeaders = ['id', 'title', 'description', 'category', 'url', 'fileUrl', 'fileName', 'createdAt', 'updatedAt'];
  let sheet = doc.sheetsByTitle['Resources'];
  
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Resources',
      headerValues: expectedHeaders
    });
  } else {
    // Ensure headers are aligned
    try {
      await sheet.loadHeaderRow();
      const currentHeaders = (sheet as any).headerValues || [];
      const missing = expectedHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0 || currentHeaders.length !== expectedHeaders.length) {
        await sheet.setHeaderRow(expectedHeaders);
      }
    } catch {
      await sheet.setHeaderRow(expectedHeaders);
    }
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
    // Robust body parsing: read raw text once based on content-type
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      const raw = await request.text();
      try {
        body = JSON.parse(raw);
      } catch (parseErr: any) {
        const sample = raw ? raw.slice(0, 200) : '';
        console.error('Invalid JSON body received:', sample);
        return NextResponse.json({ error: 'Invalid JSON body', details: parseErr?.message || 'Failed to parse JSON', sample }, { status: 400 });
      }
    } else {
      // Not JSON, return unsupported media type
      return NextResponse.json({ error: 'Unsupported Content-Type. Use application/json' }, { status: 415 });
    }

    let { title, description, category, url, fileUrl, fileName } = body;

    // Validate required fields
    const titleValidation = validateRequiredText(title, 'Title', 3, 200);
    if (!titleValidation.isValid) {
      return NextResponse.json({ error: titleValidation.error }, { status: 400 });
    }
    const descValidation = validateRequiredText(description, 'Description', 3, 2000);
    if (!descValidation.isValid) {
      return NextResponse.json({ error: descValidation.error }, { status: 400 });
    }
    const allowedCategories = ['review-tools', 'reference-materials', 'training-materials'];
    if (!category || !allowedCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return NextResponse.json({ error: urlValidation.error }, { status: 400 });
    }

    // Sanitize inputs to prevent formula injection
    title = sanitizeInput(String(title).trim());
    description = sanitizeInput(String(description).trim());
    category = sanitizeInput(String(category).trim());
    url = url ? sanitizeInput(String(url).trim()) : '';
    fileUrl = fileUrl ? sanitizeInput(String(fileUrl).trim()) : '';
    fileName = fileName ? sanitizeInput(String(fileName).trim()) : '';

    const doc = await initializeGoogleSheets();
    const sheet = await getResourcesSheet(doc);
    await sheet.loadHeaderRow();
    
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
  } catch (error: any) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { error: 'Failed to create resource', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}