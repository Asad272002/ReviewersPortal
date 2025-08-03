const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

async function addTestUser() {
  try {
    console.log('Adding test user to Google Sheets...');
    
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
      console.log('Creating Users sheet...');
      usersSheet = await doc.addSheet({
        title: 'Users',
        headerValues: ['ID', 'Username', 'Password', 'Name', 'Role']
      });
    }
    
    // Check if test user already exists
    const rows = await usersSheet.getRows();
    const existingUser = rows.find(row => row.get('Username') === 'admin');
    
    if (existingUser) {
      console.log('Test user already exists!');
      return;
    }
    
    // Add test user
    await usersSheet.addRow({
      'ID': 'user_001',
      'Username': 'admin',
      'Password': 'admin123',
      'Name': 'Admin User',
      'Role': 'admin'
    });
    
    console.log('Test user added successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error adding test user:', error);
  }
}

addTestUser();