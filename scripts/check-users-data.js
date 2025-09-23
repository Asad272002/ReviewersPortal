const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function checkUsersData() {
  try {
    // Load service account credentials
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Initialize the sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    console.log('Document title:', doc.title);
    console.log('Available sheets:', doc.sheetsByTitle);

    // Get the Users sheet
    const usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      console.log('Users sheet not found!');
      return;
    }

    console.log('\n=== Users Sheet Info ===');
    console.log('Sheet title:', usersSheet.title);
    console.log('Row count:', usersSheet.rowCount);
    console.log('Column count:', usersSheet.columnCount);

    // Load the header row
    await usersSheet.loadHeaderRow();
    console.log('\nHeaders:', usersSheet.headerValues);

    // Get all rows
    const rows = await usersSheet.getRows();
    console.log('\n=== Users Data ===');
    console.log('Number of rows:', rows.length);

    rows.forEach((row, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log('  ID:', row.get('ID') || 'N/A');
      console.log('  Username:', row.get('Username') || 'N/A');
      console.log('  Email:', row.get('Email') || 'N/A');
      console.log('  Full Name:', row.get('Full Name') || 'N/A');
      console.log('  Role:', row.get('Role') || 'N/A');
      console.log('  Status:', row.get('Status') || 'N/A');
    });

    // Look specifically for the test user
    const testUser = rows.find(row => 
      row.get('Username') === 'teamtest' || 
      row.get('Email') === 'teamtest@example.com'
    );

    if (testUser) {
      console.log('\n=== Test User Found ===');
      console.log('ID:', testUser.get('ID'));
      console.log('Username:', testUser.get('Username'));
      console.log('Email:', testUser.get('Email'));
      console.log('Full Name:', testUser.get('Full Name'));
      console.log('Role:', testUser.get('Role'));
      console.log('Status:', testUser.get('Status'));
    } else {
      console.log('\n=== Test User Not Found ===');
    }

  } catch (error) {
    console.error('Error checking users data:', error);
  }
}

checkUsersData();