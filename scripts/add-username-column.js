const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addUsernameColumn() {
  try {
    console.log('Adding Team Leader Username column to Awarded Teams sheet...');
    
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
    
    // Load current headers
    await awardedTeamsSheet.loadHeaderRow();
    console.log('Current headers:', awardedTeamsSheet.headerValues);
    
    // Check if Team Leader Username column already exists
    if (awardedTeamsSheet.headerValues.includes('Team Leader Username')) {
      console.log('Team Leader Username column already exists!');
      return;
    }
    
    // Add the new header after Team Leader Email
    const currentHeaders = awardedTeamsSheet.headerValues;
    const emailIndex = currentHeaders.indexOf('Team Leader Email');
    
    if (emailIndex === -1) {
      console.log('Team Leader Email column not found!');
      return;
    }
    
    // Insert the new column after Team Leader Email
    const newHeaders = [...currentHeaders];
    newHeaders.splice(emailIndex, 0, 'Team Leader Username');
    
    // Update headers
    await awardedTeamsSheet.setHeaderRow(newHeaders);
    console.log('✓ Added Team Leader Username column');
    
    // Now update existing rows with username data
    const rows = await awardedTeamsSheet.getRows();
    console.log(`Updating ${rows.length} existing rows...`);
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = row.get('Team Leader Email');
      
      // For our test data, if email is teamtest@example.com, set username to teamtest
      if (email === 'teamtest@example.com') {
        row.set('Team Leader Username', 'teamtest');
        await row.save();
        console.log(`✓ Updated row ${i + 1} with username: teamtest`);
      }
    }
    
    console.log('\n=== Column Addition Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addUsernameColumn();