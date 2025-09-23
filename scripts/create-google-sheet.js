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
    
    // Create a new document using the static method
    const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(serviceAccountAuth, {
      title: 'Review Circle - Proposal Submissions'
    });
    
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
    
    // Create Awarded Teams sheet
    const awardedTeamsSheet = await doc.addSheet({ title: 'Awarded Teams' });
    await awardedTeamsSheet.setHeaderRow([
      'ID',
      'Name',
      'Description',
      'Status',
      'CreatedAt'
    ]);
    
    // Create Reviewers sheet
    const reviewersSheet = await doc.addSheet({ title: 'Reviewers' });
    await reviewersSheet.setHeaderRow([
      'ID',
      'Name',
      'Email',
      'Specialization',
      'Status',
      'CreatedAt'
    ]);
    
    // Create Team Reviewer Assignments sheet
    const assignmentsSheet = await doc.addSheet({ title: 'Team Reviewer Assignments' });
    await assignmentsSheet.setHeaderRow([
      'ID',
      'TeamID',
      'ReviewerID',
      'Status',
      'AssignedAt',
      'ApprovedAt',
      'CompletedAt'
    ]);
    
    // Create ChatSessions sheet
    const chatSessionsSheet = await doc.addSheet({ title: 'ChatSessions' });
    await chatSessionsSheet.setHeaderRow([
      'ID',
      'AssignmentID',
      'TeamID',
      'ReviewerID',
      'Status',
      'CreatedAt',
      'LastActivity'
    ]);
    
    // Create ChatMessages sheet
    const chatMessagesSheet = await doc.addSheet({ title: 'ChatMessages' });
    await chatMessagesSheet.setHeaderRow([
      'ID',
      'SessionID',
      'SenderID',
      'SenderRole',
      'Content',
      'MessageType',
      'Timestamp',
      'FileData'
    ]);
    
    console.log('Sheets set up successfully!');
    console.log('Your Google Sheet is now ready to use with the complete Review Circle system.');
    console.log('\nCreated sheets:');
    console.log('- Proposals: For proposal submissions');
    console.log('- Users: For user authentication');
    console.log('- Awarded Teams: For managing awarded teams');
    console.log('- Reviewers: For reviewer information');
    console.log('- Team Reviewer Assignments: For team-reviewer assignments');
    console.log('- ChatSessions: For chat session management');
    console.log('- ChatMessages: For storing chat messages');
    console.log('\nRemember to:');
    console.log('1. Add the Sheet ID to your .env.local file');
    console.log('2. Share the sheet with your service account email');
    console.log('3. Grant Editor permissions to the service account');
    console.log('4. Test the Awarded Teams Connect feature');
    
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
  }
}

createSheet();