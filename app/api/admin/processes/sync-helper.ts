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
    files: { title: string; url: string; type: 'pdf' | 'doc' | 'excel' | 'powerpoint' }[];
  };
  createdAt: string;
  updatedAt: string;
}

export async function loadProcessesFromSheets(): Promise<ProcessDoc[]> {
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

    // Find the "Processes" sheet
    const sheet = doc.sheetsByTitle['Processes'];
    if (!sheet) {
      console.log('Processes sheet not found, returning empty array');
      return [];
    }

    // Get all rows
    const rows = await sheet.getRows();
    
    // Convert rows to ProcessDoc objects
    const processesFromSheets = rows.map(row => {
      const attachmentsStr = row.get('Attachments') || '';
      const attachments: {
        links: { title: string; url: string }[];
        files: { title: string; url: string; type: 'pdf' | 'doc' | 'excel' | 'powerpoint' }[];
      } = {
        links: [],
        files: []
      };
      
      // Parse attachments if they exist
      if (attachmentsStr) {
        try {
          // More robust parsing with proper validation
          const attachmentParts = attachmentsStr.split(', ');
          attachmentParts.forEach((part: string) => {
            const trimmedPart = part.trim();
            if (trimmedPart.includes(': ')) {
              const colonIndex = trimmedPart.indexOf(': ');
              const title = trimmedPart.substring(0, colonIndex).trim();
              const url = trimmedPart.substring(colonIndex + 2).trim();
              
              // Validate that both title and url exist
              if (title && url) {
                // Determine file type based on extension
                const fileExtension = url.toLowerCase();
                if (fileExtension.includes('.pdf') || fileExtension.includes('.doc') || 
                    fileExtension.includes('.docx') || fileExtension.includes('.xls') || 
                    fileExtension.includes('.xlsx') || fileExtension.includes('.ppt') || 
                    fileExtension.includes('.pptx')) {
                  // Determine the actual file type
                  let fileType: 'pdf' | 'doc' | 'excel' | 'powerpoint' = 'pdf';
                  if (fileExtension.includes('.doc')) fileType = 'doc';
                  else if (fileExtension.includes('.xls')) fileType = 'excel';
                  else if (fileExtension.includes('.ppt')) fileType = 'powerpoint';
                  
                  attachments.files.push({ title, url, type: fileType });
                } else {
                  attachments.links.push({ title, url });
                }
              }
            }
          });
        } catch (parseError) {
          console.warn('Error parsing attachments for process:', parseError);
          // Continue without attachments if parsing fails
        }
      }
      
      // Map category values to valid ProcessDoc categories
      const categoryMapping: { [key: string]: 'workflow' | 'guidelines' | 'procedures' | 'templates' } = {
        'approval': 'procedures',
        'quality': 'guidelines',
        'workflow': 'workflow',
        'guidelines': 'guidelines',
        'procedures': 'procedures',
        'templates': 'templates'
      };
      
      const rawCategory = row.get('Category') || 'workflow';
      const mappedCategory = categoryMapping[rawCategory] || 'workflow';
      
      const statusRaw = (row.get('Status') || 'draft').toString().toLowerCase();
      const allowedStatuses = ['published', 'draft', 'archived'] as const;
      const normalizedStatus = allowedStatuses.includes(statusRaw as any) ? (statusRaw as typeof allowedStatuses[number]) : 'draft';
      
      return {
        id: row.get('ID') || '',
        title: row.get('Title') || '',
        description: row.get('Description') || '',
        content: row.get('Content') || '',
        category: mappedCategory,
        order: parseInt(row.get('Order') || '0'),
        status: normalizedStatus,
        attachments,
        createdAt: row.get('Created At') || new Date().toISOString(),
        updatedAt: row.get('Updated At') || new Date().toISOString()
      };
    });
    
    return processesFromSheets;
  } catch (error: any) {
    console.error('Error loading processes from sheets:', error);
    // Return empty array on error
    return [];
  }
}

export async function syncProcessesToSheets(processes: ProcessDoc[]): Promise<{ success: boolean; count?: number; error?: string }> {
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
  } catch (error: any) {
    console.error('Error syncing processes to sheets:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}