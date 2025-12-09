const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

async function addTeamLeaderUser() {
  try {
    console.log('Adding team leader user to Google Sheets...');
    
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
    
    // Check if team leader user already exists
    const rows = await usersSheet.getRows();
    const existingUser = rows.find(row => row.get('Username') === 'teamleader1');
    
    if (existingUser) {
      console.log('Team leader user already exists!');
      return;
    }
    
    // Add team leader user
    await usersSheet.addRow({
      'ID': (rows.length + 1).toString(),
      'Username': 'teamleader1',
      'Password': 'team123',
      'Name': 'Project Team Leader',
      'Role': 'team_leader'
    });
    
    console.log('Team leader user added successfully!');
    console.log('Username: teamleader1');
    console.log('Password: team123');
    
  } catch (error) {
    console.error('Error adding team leader user:', error);
  }
}

addTeamLeaderUser();