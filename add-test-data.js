const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addTestData() {
  try {
    console.log('Adding test data to Google Sheets...');
    
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Add test announcement
    const announcementsSheet = doc.sheetsByTitle['Announcements'];
    if (announcementsSheet) {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
      
      await announcementsSheet.addRow({
        id: 'ann_001',
        title: 'Test Announcement',
        content: 'This is a test announcement for CRUD operations.',
        category: 'general',
        duration: '30',
        expiresAt: expiresAt,
        createdAt: now,
        updatedAt: now
      });
      console.log('✓ Added test announcement');
    }
    
    // Add test resource
    const resourcesSheet = doc.sheetsByTitle['Resources'];
    if (resourcesSheet) {
      const now = new Date().toISOString();
      
      await resourcesSheet.addRow({
        id: 'res_001',
        title: 'Test Resource',
        description: 'This is a test resource for CRUD operations.',
        category: 'Review Tools',
        url: 'https://example.com',
        fileUrl: '',
        fileName: '',
        createdAt: now,
        updatedAt: now
      });
      console.log('✓ Added test resource');
    }
    
    // Add test guide
    const guidesSheet = doc.sheetsByTitle['Guides'];
    if (guidesSheet) {
      const now = new Date().toISOString();
      
      await guidesSheet.addRow({
        id: 'guide_001',
        title: 'Test Guide',
        description: 'This is a test guide for CRUD operations.',
        content: 'Detailed guide content here...',
        order: '1',
        isPublished: 'true',
        attachments: '[]',
        createdAt: now,
        updatedAt: now
      });
      console.log('✓ Added test guide');
    }
    
    // Create Support Tickets sheet and add test data
    let supportTicketsSheet = doc.sheetsByTitle['Support Tickets'];
    if (!supportTicketsSheet) {
      supportTicketsSheet = await doc.addSheet({
        title: 'Support Tickets',
        headerValues: ['id', 'name', 'email', 'category', 'message', 'status', 'priority', 'assignedTo', 'notes', 'createdAt', 'updatedAt']
      });
      console.log('✓ Created Support Tickets sheet');
    }
    
    if (supportTicketsSheet) {
      const now = new Date().toISOString();
      
      await supportTicketsSheet.addRow({
        id: 'ticket_001',
        name: 'Test User',
        email: 'test@example.com',
        category: 'Technical Issue',
        message: 'This is a test support ticket for CRUD operations.',
        status: 'open',
        priority: 'medium',
        assignedTo: '',
        notes: '',
        createdAt: now,
        updatedAt: now
      });
      console.log('✓ Added test support ticket');
    }
    
    console.log('\nTest data added successfully! You can now test CRUD operations.');
    
  } catch (error) {
    console.error('Error adding test data:', error.message);
  }
}

addTestData();