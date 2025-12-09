// Script to add voting system sheets to Google Spreadsheet
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addVotingSystem() {
  try {
    console.log('Adding voting system to Google Sheets...');
    
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Sheets environment variables not configured');
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    console.log(`Working with Google Sheet: ${doc.title}`);
    
    // Check if Voting Results sheet already exists
    let votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    
    if (!votingResultsSheet) {
      console.log('Creating Voting Results sheet...');
      votingResultsSheet = await doc.addSheet({ title: 'Voting Results' });
      
      // Set headers for Voting Results sheet
      await votingResultsSheet.setHeaderRow([
        'proposalId',
        'proposalTitle',
        'reviewerName',
        'projectCategory',
        'teamSize',
        'budgetEstimate',
        'timelineWeeks',
        'proposalSummary',
        'technicalApproach',
        'submissionDate',
        'votingDeadline',
        'status', // active, expired, completed
        'totalUpvotes',
        'totalDownvotes',
        'netScore',
        'voterCount',
        'isWinner',
        'createdAt',
        'updatedAt'
      ]);
      
      console.log('✓ Voting Results sheet created');
    } else {
      console.log('✓ Voting Results sheet already exists');
    }
    
    // Check if Votes sheet already exists
    let votesSheet = doc.sheetsByTitle['Votes'];
    
    if (!votesSheet) {
      console.log('Creating Votes sheet...');
      votesSheet = await doc.addSheet({ title: 'Votes' });
      
      // Set headers for individual votes tracking
      await votesSheet.setHeaderRow([
        'voteId',
        'proposalId',
        'userId',
        'username',
        'voteType', // upvote, downvote
        'votedAt',
        'ipAddress',
        'userAgent'
      ]);
      
      console.log('✓ Votes sheet created');
    } else {
      console.log('✓ Votes sheet already exists');
    }
    
    // Check if Voting Settings sheet already exists
    let votingSettingsSheet = doc.sheetsByTitle['Voting Settings'];
    
    if (!votingSettingsSheet) {
      console.log('Creating Voting Settings sheet...');
      votingSettingsSheet = await doc.addSheet({ title: 'Voting Settings' });
      
      // Set headers for voting configuration
      await votingSettingsSheet.setHeaderRow([
        'settingKey',
        'settingValue',
        'description',
        'updatedAt'
      ]);
      
      // Add default voting settings
      await votingSettingsSheet.addRows([
        {
          'settingKey': 'voting_duration_days',
          'settingValue': '30',
          'description': 'Number of days voting remains open for each proposal',
          'updatedAt': new Date().toISOString()
        },
        {
          'settingKey': 'min_votes_required',
          'settingValue': '5',
          'description': 'Minimum number of votes required for a proposal to be considered',
          'updatedAt': new Date().toISOString()
        },
        {
          'settingKey': 'auto_close_voting',
          'settingValue': 'true',
          'description': 'Automatically close voting after duration expires',
          'updatedAt': new Date().toISOString()
        },
        {
          'settingKey': 'allow_vote_changes',
          'settingValue': 'false',
          'description': 'Allow users to change their vote before deadline',
          'updatedAt': new Date().toISOString()
        }
      ]);
      
      console.log('✓ Voting Settings sheet created with default settings');
    } else {
      console.log('✓ Voting Settings sheet already exists');
    }
    
    console.log('\n✅ Voting system sheets created successfully!');
    console.log('\nNext steps:');
    console.log('1. Create the Vote for Proposals page component');
    console.log('2. Add voting API routes');
    console.log('3. Update the sidebar to include the new voting tab');
    console.log('4. Implement the voting logic and timer system');
    
  } catch (error) {
    console.error('❌ Error adding voting system:', error.message);
  }
}

addVotingSystem();