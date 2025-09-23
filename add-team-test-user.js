const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addTeamTestUser() {
  try {
    console.log('Adding team test user to Google Sheets...');
    
    // Initialize authentication
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the Google Sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get Users sheet
    let usersSheet = doc.sheetsByTitle['Users'];
    if (!usersSheet) {
      console.log('Users sheet not found!');
      return;
    }
    
    // Get Awarded Teams sheet
    let awardedTeamsSheet = doc.sheetsByTitle['Awarded Teams'];
    if (!awardedTeamsSheet) {
      console.log('Awarded Teams sheet not found!');
      return;
    }
    
    // Generate unique team ID
    const teamId = `TEAM-${Date.now()}`;
    
    // Check if test team user already exists in Users sheet
    const userRows = await usersSheet.getRows();
    const existingUser = userRows.find(row => row.get('Username') === 'teamtest');
    
    if (existingUser) {
      console.log('Team test user already exists in Users sheet!');
    } else {
      // Add team test user to Users sheet
      await usersSheet.addRow({
        'ID': 'teamtest', // Use username as user ID
        'Username': 'teamtest',
        'Password': 'team123',
        'Email': 'teamtest@example.com',
        'Name': 'Test Team Leader',
        'Role': 'team_leader' // Use team_leader role for team leaders
      });
      console.log('✓ Team test user added to Users sheet');
    }
    
    // Check if test team already exists in AwardedTeams sheet
    const teamRows = await awardedTeamsSheet.getRows();
    const existingTeam = teamRows.find(row => row.get('ID') === teamId || row.get('Name') === 'Test Team');
    
    if (existingTeam) {
      console.log('Test team already exists in AwardedTeams sheet!');
    } else {
      // Add test team to AwardedTeams sheet
      await awardedTeamsSheet.addRow({
        'ID': teamId,
        'Team Name': 'Test Team',
        'Proposal ID': 'PROP-TEST-001',
        'Proposal Title': 'Test Team Proposal for Awarded Teams Connect',
        'Team Leader Username': 'teamtest', // Link to Users sheet
        'Team Leader Email': 'teamtest@example.com',
        'Team Leader Name': 'Test Team Leader',
        'Award Date': new Date().toISOString().split('T')[0],
        'Status': 'active',
        'Created At': new Date().toISOString(),
        'Updated At': new Date().toISOString()
      });
      console.log('✓ Test team added to AwardedTeams sheet');
    }
    
    console.log('\n=== Team Test User Setup Complete ===');
    console.log('Login credentials:');
    console.log('Username: teamtest');
    console.log('Password: team123');
    console.log('Role: team_leader (acts as team leader)');
    console.log(`Team ID: ${teamId}`);
    console.log('\nTo test:');
    console.log('1. Login with the above credentials');
    console.log('2. Navigate to the dashboard');
    console.log('3. Look for the "Awarded Teams Connect" section');
    console.log('4. The system will check if this user ID matches any team ID');
    console.log('5. You can then assign a reviewer to this team via admin panel');
    
  } catch (error) {
    console.error('Error adding team test user:', error);
  }
}

addTeamTestUser();