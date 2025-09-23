const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function checkAwardedTeamsData() {
  try {
    console.log('Checking Awarded Teams data...');
    
    // Initialize authentication
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the Google Sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get Awarded Teams sheet
    let awardedTeamsSheet = doc.sheetsByTitle['Awarded Teams'];
    if (!awardedTeamsSheet) {
      console.log('Awarded Teams sheet not found!');
      return;
    }
    
    // Load headers
    await awardedTeamsSheet.loadHeaderRow();
    console.log('Headers:', awardedTeamsSheet.headerValues);
    
    // Get all rows
    const rows = await awardedTeamsSheet.getRows();
    console.log(`\nFound ${rows.length} rows:`);
    
    rows.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log('  ID:', row.get('ID'));
      console.log('  Team Name:', row.get('Team Name'));
      console.log('  Team Leader Username:', row.get('Team Leader Username'));
      console.log('  Team Leader Email:', row.get('Team Leader Email'));
      console.log('  Team Leader Name:', row.get('Team Leader Name'));
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAwardedTeamsData();