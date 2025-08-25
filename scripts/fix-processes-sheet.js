const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function fixProcessesSheet() {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log('Working with Google Sheet:', doc.title);

    // Find or create the "Processes" sheet
    let sheet = doc.sheetsByTitle['Processes'];
    if (!sheet) {
      console.log('Creating Processes sheet...');
      sheet = await doc.addSheet({ title: 'Processes' });
    } else {
      console.log('Processes sheet exists, clearing...');
      await sheet.clear();
    }

    // Set the correct headers that match sync-helper.ts
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
    console.log('✓ Headers set correctly:', headers);
    
    console.log('\n✅ Processes sheet fixed with correct headers!');
    console.log('Now the admin panel and user-facing processes should work correctly.');
    
  } catch (error) {
    console.error('Error fixing Processes sheet:', error);
  }
}

fixProcessesSheet();