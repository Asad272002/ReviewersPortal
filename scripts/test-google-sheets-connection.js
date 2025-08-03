// Script to test the connection to Google Sheets
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  try {
    // Check if environment variables are set
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Error: Missing required environment variables.');
      console.log('Please make sure you have set up the following in your .env.local file:');
      console.log('- GOOGLE_SHEET_ID');
      console.log('- GOOGLE_SERVICE_ACCOUNT_EMAIL');
      console.log('- GOOGLE_PRIVATE_KEY');
      return;
    }

    console.log('Testing connection to Google Sheets...');
    console.log(`Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
    console.log(`Service Account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
    
    // Initialize authentication with JWT
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the Google Sheet with authentication
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    
    // Load document properties and sheets
    await doc.loadInfo();
    
    console.log('\n✅ Connection successful!');
    console.log(`Sheet title: ${doc.title}`);
    console.log(`Total sheets: ${doc.sheetCount}`);
    
    // List all sheets
    console.log('\nAvailable sheets:');
    doc.sheetsByIndex.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.title} (${sheet.rowCount} rows)`);
    });
    
    // Test adding a test row to the Proposals sheet
    console.log('\nAdding a test row to the Proposals sheet to verify write permissions...');
    const proposalsSheet = doc.sheetsByTitle['Proposals'] || doc.sheetsByIndex[0];
    await proposalsSheet.addRow({
      'Reviewer Name': 'Test User',
      'Proposal Title': 'Connection Test',
      'Project Category': 'Test',
      'Team Size': 'N/A',
      'Budget Estimate': 'N/A',
      'Timeline (Weeks)': 'N/A',
      'Proposal Summary': 'This is a test entry to verify the Google Sheets connection.',
      'Technical Approach': 'N/A',
      'Additional Notes': 'This test row can be safely deleted.',
      'Submission Date': new Date().toISOString(),
      'Proposal ID': `TEST-${Date.now()}`
    });
    
    console.log('\n✅ Test row added to Proposals sheet successfully!');
    
    // Test reading from the Users sheet
    console.log('\nTesting access to the Users sheet...');
    const usersSheet = doc.sheetsByTitle['Users'];
    if (usersSheet) {
      const rows = await usersSheet.getRows();
      console.log(`Found ${rows.length} users in the Users sheet.`);
      console.log('Sample user roles:');
      rows.slice(0, 3).forEach(row => {
        console.log(`- ${row.get('Username')}: ${row.get('Role')}`);
      });
      console.log('\n✅ Users sheet access successful!');
    } else {
      console.log('\n⚠️ Users sheet not found. Make sure you have created it using create-google-sheet.js');
    }
    console.log('Your Google Sheets integration is working correctly.');
    console.log('\nYou can now:');
    console.log('1. Delete the test row from your Google Sheet');
    console.log('2. Ensure the Google Sheets integration code is uncommented in app/api/submit-proposal/route.ts');
    console.log('3. The authentication API is set up to use Google Sheets for user credentials');
    console.log('4. Restart your development server');
    
  } catch (error) {
    console.error('\n❌ Error testing Google Sheets connection:', error);
    console.log('\nPlease check:');
    console.log('1. Your Google Cloud project has the Google Sheets API enabled');
    console.log('2. Your service account has the correct permissions');
    console.log('3. Your Google Sheet is shared with the service account email');
    console.log('4. Your .env.local file has the correct credentials');
  }
}

testConnection();