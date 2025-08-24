const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

async function addCoordinatorUser() {
  try {
    console.log('Adding coordinator user to Google Sheets...');
    
    // Initialize authentication
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the Google Sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get or create Users sheet
    let usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      console.log('Users sheet not found!');
      return;
    }
    
    // Check if coordinator user already exists
    const rows = await usersSheet.getRows();
    const existingUser = rows.find(row => row.get('Username') === 'coordinator1');
    
    if (existingUser) {
      console.log('Coordinator user already exists!');
      return;
    }
    
    // Add coordinator user
    await usersSheet.addRow({
      'ID': 'user_004',
      'Username': 'coordinator1',
      'Password': 'coord123',
      'Name': 'Project Coordinator',
      'Role': 'coordinator'
    });
    
    console.log('Coordinator user added successfully!');
    console.log('Username: coordinator1');
    console.log('Password: coord123');
    
  } catch (error) {
    console.error('Error adding coordinator user:', error);
  }
}

addCoordinatorUser();