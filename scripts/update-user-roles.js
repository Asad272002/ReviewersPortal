// Script to update user roles in Google Sheets
// Removes 'coordinator' role and adds 'team_leader' role
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function updateUserRoles() {
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

    // Initialize authentication with JWT
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the Google Sheet with authentication
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get the Users sheet
    const usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      console.error('Users sheet not found in the Google Sheet');
      return;
    }
    
    console.log('Updating user roles in Google Sheets...');
    
    // Get all rows from the Users sheet
    const rows = await usersSheet.getRows();
    
    let updatedCount = 0;
    
    // Update existing users with coordinator role to team_leader
    for (const row of rows) {
      const currentRole = row.get('Role');
      if (currentRole === 'coordinator') {
        row.set('Role', 'team_leader');
        await row.save();
        updatedCount++;
        console.log(`Updated user ${row.get('Username')} from coordinator to team_leader`);
      }
    }
    
    // Add sample team leader users if none exist
    const teamLeaderExists = rows.some(row => row.get('Role') === 'team_leader');
    
    if (!teamLeaderExists) {
      console.log('No team leaders found, adding sample team leader users...');
      
      // Get the next available ID
      const maxId = Math.max(...rows.map(row => parseInt(row.get('ID')) || 0));
      
      await usersSheet.addRows([
        {
          'ID': (maxId + 1).toString(),
          'Username': 'team_leader1',
          'Password': 'team123',
          'Name': 'Team Leader One',
          'Role': 'team_leader'
        },
        {
          'ID': (maxId + 2).toString(),
          'Username': 'team_leader2',
          'Password': 'team123',
          'Name': 'Team Leader Two',
          'Role': 'team_leader'
        }
      ]);
      
      console.log('Added 2 sample team leader users');
    }
    
    console.log('\n=== User Role Update Summary ===');
    console.log(`Updated ${updatedCount} coordinator roles to team_leader`);
    console.log('\nCurrent role structure:');
    console.log('- admin: Full system access');
    console.log('- reviewer: Can review and assign teams');
    console.log('- team_leader: Can access team dashboard for awarded teams');
    console.log('\nNext steps:');
    console.log('1. Update the auth types in your application');
    console.log('2. Update the authentication logic');
    console.log('3. Update the dashboard visibility logic');
    
  } catch (error) {
    console.error('Error updating user roles:', error);
  }
}

updateUserRoles();