import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

interface ProcessDoc {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'workflow' | 'guidelines' | 'procedures' | 'templates';
  order: number;
  status: 'published' | 'draft' | 'archived';
  attachments: {
    links: { title: string; url: string }[];
    files: { title: string; url: string; type: string }[];
  };
  createdAt: string;
  updatedAt: string;
}

export async function syncProcessesToSheets(processes: ProcessDoc[]) {
  try {
    // Initialize Google Sheets authentication
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Initialize the sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();

    // Find or create the "Processes" sheet
    let sheet = doc.sheetsByTitle['Processes'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Processes' });
    }

    // Clear existing data
    await sheet.clear();

    // Set headers
    const headers = [
      'ID',
      'Title',
      'Description',
      'Content',
      'Category',
      'Order',
      'Status',
      'Attachments',
      'Created At',
      'Updated At'
    ];
    
    await sheet.setHeaderRow(headers);

    // Add process data
    const rows = processes.map(process => ({
      'ID': process.id,
      'Title': process.title,
      'Description': process.description,
      'Content': process.content.substring(0, 500) + (process.content.length > 500 ? '...' : ''), // Truncate long content
      'Category': process.category,
      'Order': process.order.toString(),
      'Status': process.status,
      'Attachments': [
        ...process.attachments.links.map(link => `${link.title}: ${link.url}`),
        ...process.attachments.files.map(file => `${file.title}: ${file.url}`)
      ].join(', '),
      'Created At': new Date(process.createdAt).toLocaleString(),
      'Updated At': new Date(process.updatedAt).toLocaleString()
    }));

    if (rows.length > 0) {
      await sheet.addRows(rows);
    }

    console.log(`✓ Synced ${processes.length} processes to Google Sheets`);
    return { success: true, count: processes.length };
  } catch (error) {
    console.error('Error syncing processes to sheets:', error);
    return { success: false, error: error.message };
  }
}