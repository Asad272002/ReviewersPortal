// Script to add missing sheets to an existing Google Sheet for the Awarded Teams Connect feature
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function updateSheet() {
  try {
    // Check if environment variables are set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      console.error('Error: Missing required environment variables.');
      console.log('Please make sure you have set up the following in your .env.local file:');
      console.log('- GOOGLE_SERVICE_ACCOUNT_EMAIL');
      console.log('- GOOGLE_PRIVATE_KEY');
      console.log('- GOOGLE_SHEET_ID');
      return;
    }

    // Initialize authentication with JWT
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Connect to existing document
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    console.log(`Connected to Google Sheet: ${doc.title}`);
    console.log(`Current sheets: ${doc.sheetsByIndex.map(sheet => sheet.title).join(', ')}`);
    
    // Check which sheets already exist
    const existingSheets = doc.sheetsByIndex.map(sheet => sheet.title);
    const requiredSheets = [
      'Proposals',
      'Users', 
      'Awarded Teams',
      'Reviewers',
      'Team Reviewer Assignments',
      'ChatSessions',
      'ChatMessages'
    ];
    
    // Create Awarded Teams sheet if it doesn't exist
    if (!existingSheets.includes('Awarded Teams')) {
      console.log('Creating Awarded Teams sheet...');
      const awardedTeamsSheet = await doc.addSheet({ title: 'Awarded Teams' });
      await awardedTeamsSheet.setHeaderRow([
        'ID',
        'Name',
        'Description',
        'Status',
        'CreatedAt'
      ]);
      console.log('✓ Awarded Teams sheet created');
    } else {
      console.log('✓ Awarded Teams sheet already exists');
    }
    
    // Create Reviewers sheet if it doesn't exist
    if (!existingSheets.includes('Reviewers')) {
      console.log('Creating Reviewers sheet...');
      const reviewersSheet = await doc.addSheet({ title: 'Reviewers' });
      await reviewersSheet.setHeaderRow([
        'ID',
        'Name',
        'Email',
        'Specialization',
        'Status',
        'CreatedAt'
      ]);
      console.log('✓ Reviewers sheet created');
    } else {
      console.log('✓ Reviewers sheet already exists');
    }
    
    // Create Team Reviewer Assignments sheet if it doesn't exist
    if (!existingSheets.includes('Team Reviewer Assignments')) {
      console.log('Creating Team Reviewer Assignments sheet...');
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
      console.log('✓ Team Reviewer Assignments sheet created');
    } else {
      console.log('✓ Team Reviewer Assignments sheet already exists');
    }
    
    // Create ChatSessions sheet if it doesn't exist
    if (!existingSheets.includes('ChatSessions')) {
      console.log('Creating ChatSessions sheet...');
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
      console.log('✓ ChatSessions sheet created');
    } else {
      console.log('✓ ChatSessions sheet already exists');
    }
    
    // Create ChatMessages sheet if it doesn't exist
    if (!existingSheets.includes('ChatMessages')) {
      console.log('Creating ChatMessages sheet...');
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
      console.log('✓ ChatMessages sheet created');
    } else {
      console.log('✓ ChatMessages sheet already exists');
    }
    
    console.log('\n🎉 Google Sheet update completed successfully!');
    console.log('Your Google Sheet now includes all required sheets for the Awarded Teams Connect feature.');
    console.log('\nFinal sheets:');
    await doc.loadInfo(); // Reload to get updated sheet list
    doc.sheetsByIndex.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.title}`);
    });
    
  } catch (error) {
    console.error('Error updating Google Sheet:', error.message);
    if (error.response?.status === 403) {
      console.log('\n❌ Permission denied. Please ensure:');
      console.log('1. Your service account has Editor access to the Google Sheet');
      console.log('2. The Google Sheet ID in your .env.local file is correct');
      console.log('3. The service account email has been shared with the sheet');
    }
  }
}

updateSheet();