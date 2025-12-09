const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function testSheets() {
  try {
    console.log('Testing Google Sheets connection...');
    
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
    
    console.log('Document title:', doc.title);
    console.log('Available sheets:');
    
    const requiredSheets = ['Announcements', 'Resources', 'Guides', 'Support Tickets'];
    
    for (const sheetName of requiredSheets) {
      const sheet = doc.sheetsByTitle[sheetName];
      if (sheet) {
        console.log(`✓ ${sheetName} sheet exists`);
        await sheet.loadHeaderRow();
        console.log(`  Headers: ${sheet.headerValues.join(', ')}`);
        
        const rows = await sheet.getRows();
        console.log(`  Rows: ${rows.length}`);
      } else {
        console.log(`✗ ${sheetName} sheet missing`);
      }
    }
    
  } catch (error) {
    console.error('Error testing sheets:', error.message);
  }
}

testSheets();