const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function fixAwardedTeamsData() {
  try {
    console.log('Fixing Awarded Teams data...');
    
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
    
    // Get all rows
    const rows = await awardedTeamsSheet.getRows();
    console.log(`Found ${rows.length} rows to fix...`);
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const teamName = row.get('Team Name');
      
      // Only fix rows that have 'Test Team' as the team name
      if (teamName === 'Test Team') {
        console.log(`\nFixing row ${i + 1}:`);
        
        // Set the correct values
        row.set('Team Leader Username', 'teamtest');
        row.set('Team Leader Email', 'teamtest@example.com');
        row.set('Team Leader Name', 'Test Team Leader');
        row.set('Award Date', new Date().toISOString().split('T')[0]);
        row.set('Status', 'active');
        row.set('Created At', new Date().toISOString());
        row.set('Updated At', new Date().toISOString());
        
        await row.save();
        console.log('✓ Fixed row data');
      } else if (!teamName || teamName.trim() === '') {
        // Delete empty rows
        console.log(`\nDeleting empty row ${i + 1}`);
        await row.delete();
      }
    }
    
    console.log('\n=== Data Fix Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAwardedTeamsData();