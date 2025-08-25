const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addStatusColumn() {
  try {
    console.log('Adding status column to Announcements sheet...');
    
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
    
    const announcementsSheet = doc.sheetsByTitle['Announcements'];
    if (!announcementsSheet) {
      throw new Error('Announcements sheet not found');
    }

    // Load the header row first
    await announcementsSheet.loadHeaderRow();
    console.log('Current headers:', announcementsSheet.headerValues);
    
    // Check if status column already exists
    if (announcementsSheet.headerValues.includes('status')) {
      console.log('Status column already exists!');
      return;
    }

    // Add the status column after the category column
    const currentHeaders = announcementsSheet.headerValues;
    const categoryIndex = currentHeaders.indexOf('category');
    
    if (categoryIndex === -1) {
      throw new Error('Category column not found');
    }

    // Insert status column after category
    const newHeaders = [
      ...currentHeaders.slice(0, categoryIndex + 1),
      'status',
      ...currentHeaders.slice(categoryIndex + 1)
    ];

    // Update the header row
    await announcementsSheet.setHeaderRow(newHeaders);
    
    console.log('✅ Status column added successfully!');
    console.log('New headers:', newHeaders);
    
    // Get existing rows and set default status values
    const rows = await announcementsSheet.getRows();
    console.log(`Updating ${rows.length} existing announcements with default status...`);
    
    for (const row of rows) {
      const expiresAt = row.get('expiresAt');
      const createdAt = row.get('createdAt');
      
      let status = 'live'; // default status
      
      if (expiresAt) {
        const now = new Date();
        const expires = new Date(expiresAt);
        const created = new Date(createdAt);
        
        if (!isNaN(expires.getTime())) {
          if (now > expires) {
            status = 'expired';
          } else if (now < created) {
            status = 'upcoming';
          } else {
            status = 'live';
          }
        }
      }
      
      row.set('status', status);
      await row.save();
      console.log(`Updated announcement "${row.get('title')}" with status: ${status}`);
    }
    
    console.log('\n✅ All existing announcements updated with status values!');
    console.log('\nThe status column can now be used to manually set announcement status:');
    console.log('- "live": Currently active announcements');
    console.log('- "expired": Announcements that have expired');
    console.log('- "upcoming": Announcements scheduled for the future');
    
  } catch (error) {
    console.error('❌ Error adding status column:', error.message);
  }
}

addStatusColumn();