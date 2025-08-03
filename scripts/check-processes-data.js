const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function checkProcessesData() {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log('Working with Google Sheet:', doc.title);

    const processesSheet = doc.sheetsByTitle['Processes'];
    if (!processesSheet) {
      console.log('❌ Processes sheet not found');
      return;
    }

    await processesSheet.loadHeaderRow();
    console.log('✓ Processes sheet found');
    console.log('Headers:', processesSheet.headerValues);
    
    const rows = await processesSheet.getRows();
    console.log('Number of rows:', rows.length);
    
    rows.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log('  ID:', row.get('id'));
      console.log('  Title:', row.get('title'));
      console.log('  isPublished (raw):', JSON.stringify(row.get('isPublished')));
      console.log('  isPublished === "true":', row.get('isPublished') === 'true');
      console.log('  Category:', row.get('category'));
    });
    
  } catch (error) {
    console.error('Error checking processes data:', error);
  }
}

checkProcessesData();