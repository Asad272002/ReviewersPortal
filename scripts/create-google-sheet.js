// Script to create a new Google Sheet for proposal submissions and user credentials
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function createSheet() {
  try {
    // Check if environment variables are set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Error: Missing required environment variables.');
      console.log('Please make sure you have set up the following in your .env.local file:');
      console.log('- GOOGLE_SERVICE_ACCOUNT_EMAIL');
      console.log('- GOOGLE_PRIVATE_KEY');
      return;
    }

    // Initialize authentication with JWT
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Create a new document
    const doc = new GoogleSpreadsheet(undefined, serviceAccountAuth);
    
    // Create a new spreadsheet
    await doc.createNewSpreadsheetDocument({ title: 'Proposal Submissions' });
    
    // Get the sheet ID from the newly created document
    const sheetId = doc.spreadsheetId;
    console.log(`New Google Sheet created with ID: ${sheetId}`);
    console.log(`Add this ID to your .env.local file as GOOGLE_SHEET_ID=${sheetId}`);
    
    // Get the first sheet and rename it
    await doc.loadInfo();
    const proposalsSheet = doc.sheetsByIndex[0];
    await proposalsSheet.updateProperties({ title: 'Proposals' });
    
    // Set the header row for proposals sheet
    await proposalsSheet.setHeaderRow([
      'Reviewer Name',
      'Proposal Title',
      'Project Category',
      'Team Size',
      'Budget Estimate',
      'Timeline (Weeks)',
      'Proposal Summary',
      'Technical Approach',
      'Additional Notes',
      'Submission Date',
      'Proposal ID'
    ]);
    
    // Create a new sheet for user credentials
    const usersSheet = await doc.addSheet({ title: 'Users' });
    
    // Set the header row for users sheet
    await usersSheet.setHeaderRow([
      'ID',
      'Username',
      'Password',
      'Name',
      'Role'
    ]);
    
    // Add sample users (admin and reviewers)
    await usersSheet.addRows([
      {
        'ID': '1',
        'Username': 'admin1',
        'Password': 'admin123',
        'Name': 'Admin User',
        'Role': 'admin'
      },
      {
        'ID': '2',
        'Username': 'reviewer1',
        'Password': 'password123',
        'Name': 'John Reviewer',
        'Role': 'reviewer'
      },
      {
        'ID': '3',
        'Username': 'reviewer2',
        'Password': 'password123',
        'Name': 'Sarah Reviewer',
        'Role': 'reviewer'
      }
    ]);
    
    console.log('Sheets set up successfully!');
    console.log('Your Google Sheet is now ready to use with the proposal submission form and user authentication.');
    console.log('\nRemember to:');
    console.log('1. Add the Sheet ID to your .env.local file');
    console.log('2. Uncomment the Google Sheets integration code in app/api/submit-proposal/route.ts');
    console.log('3. Update the authentication system to use Google Sheets for user data');
    
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
  }
}

createSheet();