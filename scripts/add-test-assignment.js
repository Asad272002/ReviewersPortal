const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addTestAssignment() {
  try {
    console.log('Adding test assignment to Google Sheets...');
    
    // Initialize authentication
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Initialize the Google Sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get Team Reviewer Assignments sheet
    let assignmentsSheet = doc.sheetsByTitle['Team Reviewer Assignments'];
    if (!assignmentsSheet) {
      console.log('Team Reviewer Assignments sheet not found! Creating it...');
      assignmentsSheet = await doc.addSheet({
        title: 'Team Reviewer Assignments',
        headerValues: [
          'ID',
          'Team ID', 
          'Reviewer ID',
          'Status',
          'Assigned Date',
          'Created At',
          'Updated At'
        ]
      });
    }
    
    // Load header row
    await assignmentsSheet.loadHeaderRow();
    console.log('Assignment sheet headers:', assignmentsSheet.headerValues);
    
    // Get existing rows to check if test assignment already exists
    const existingRows = await assignmentsSheet.getRows();
    const testAssignmentExists = existingRows.some(row => 
      row.get('Team ID') === 'TEAM-1756675631448'
    );
    
    if (testAssignmentExists) {
      console.log('Test assignment already exists!');
      return;
    }
    
    // Add test assignment
    const assignmentId = `ASSIGN-${Date.now()}`;
    const now = new Date().toISOString();
    
    await assignmentsSheet.addRow({
      'ID': assignmentId,
      'Team ID': 'TEAM-1756675631448', // This matches the test team ID from the API response
      'Reviewer ID': '2', // reviewer1 from Users sheet
      'Status': 'active',
      'Assigned Date': '2025-08-31',
      'Created At': now,
      'Updated At': now
    });
    
    console.log('✅ Test assignment added successfully!');
    console.log('Assignment ID:', assignmentId);
    console.log('Team ID: TEAM-1756675631448');
    console.log('Reviewer ID: 2 (reviewer1)');
    console.log('Status: active');
    
  } catch (error) {
    console.error('Error adding test assignment:', error);
  }
}

addTestAssignment();