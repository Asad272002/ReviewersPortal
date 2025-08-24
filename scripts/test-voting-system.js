const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function testVotingSystem() {
  try {
    console.log('🔍 Testing Voting System Integration...');
    console.log('='.repeat(50));
    
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Sheets environment variables not configured');
    }

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    console.log(`📊 Connected to: "${doc.title}"`);
    console.log('');

    // Check required sheets
    const requiredSheets = ['RD', 'Votes', 'Voting Results', 'Voting Settings'];
    const missingSheets = [];

    console.log('📋 Checking Required Sheets:');
    for (const sheetName of requiredSheets) {
      const sheet = doc.sheetsByTitle[sheetName];
      if (sheet) {
        console.log(`✅ ${sheetName} - Found`);
      } else {
        console.log(`❌ ${sheetName} - Missing`);
        missingSheets.push(sheetName);
      }
    }

    if (missingSheets.length > 0) {
      console.log(`\n⚠️  Missing sheets: ${missingSheets.join(', ')}`);
      console.log('Please run the add-voting-system.js script first.');
      return;
    }

    console.log('\n📊 Analyzing Voting Data:');
    console.log('-'.repeat(30));

    // Check RD (Requirement Documents) sheet
    const proposalsSheet = doc.sheetsByTitle['RD'];
    await proposalsSheet.loadHeaderRow();
    const proposalRows = await proposalsSheet.getRows();
    
    console.log(`\n📝 RD (Requirement Documents) Sheet:`);
    console.log(`   Headers: ${proposalsSheet.headerValues.join(', ')}`);
    console.log(`   Total Proposals: ${proposalRows.length}`);
    
    if (proposalRows.length > 0) {
      console.log('\n   Recent Proposals:');
      proposalRows.slice(0, 3).forEach((row, index) => {
        const proposalId = `PROP-${String(index + 1).padStart(3, '0')}`;
        const title = row.get('Proposal Title') || 'N/A';
        const reviewer = row.get('Reviewer Name') || 'N/A';
        const category = row.get('Project Category') || 'N/A';
        const teamSize = row.get('Team Size') || 'N/A';
        const budget = row.get('Budget Estimate') || 'N/A';
        
        console.log(`   ${index + 1}. ID: ${proposalId}`);
        console.log(`      Title: ${title}`);
        console.log(`      Reviewer: ${reviewer}`);
        console.log(`      Category: ${category}`);
        console.log(`      Team Size: ${teamSize}`);
        console.log(`      Budget: ${budget}`);
        
        // For RD sheet, all proposals are considered active for voting
        console.log(`      Status: 🟢 Active (Voting Available)`);
        console.log('');
      });
    }

    // Check Votes
    const votesSheet = doc.sheetsByTitle['Votes'];
    await votesSheet.loadHeaderRow();
    const voteRows = await votesSheet.getRows();
    
    console.log(`\n🗳️  Votes Sheet:`);
    console.log(`   Headers: ${votesSheet.headerValues.join(', ')}`);
    console.log(`   Total Votes: ${voteRows.length}`);
    
    if (voteRows.length > 0) {
      console.log('\n   Recent Votes:');
      voteRows.slice(0, 5).forEach((row, index) => {
        const proposalId = row.get('Proposal ID') || 'N/A';
        const username = row.get('Username') || 'N/A';
        const voteType = row.get('Vote Type') || 'N/A';
        const voteDate = row.get('Vote Date') || 'N/A';
        
        console.log(`   ${index + 1}. Proposal: ${proposalId} | User: ${username} | Vote: ${voteType} | Date: ${voteDate}`);
      });
    }

    // Check Voting Results
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    await votingResultsSheet.loadHeaderRow();
    const resultRows = await votingResultsSheet.getRows();
    
    console.log(`\n📈 Voting Results Sheet:`);
    console.log(`   Headers: ${votingResultsSheet.headerValues.join(', ')}`);
    console.log(`   Total Results: ${resultRows.length}`);
    
    if (resultRows.length > 0) {
      console.log('\n   Current Results:');
      resultRows.forEach((row, index) => {
        const proposalId = row.get('Proposal ID') || 'N/A';
        const title = row.get('Proposal Title') || 'N/A';
        const upvotes = row.get('Total Upvotes') || '0';
        const downvotes = row.get('Total Downvotes') || '0';
        const netScore = row.get('Net Score') || '0';
        const voterCount = row.get('Voter Count') || '0';
        const status = row.get('Status') || 'N/A';
        
        console.log(`   ${index + 1}. ${title} (${proposalId})`);
        console.log(`      👍 ${upvotes} | 👎 ${downvotes} | Net: ${netScore} | Voters: ${voterCount} | Status: ${status}`);
      });
    }

    // Check Voting Settings
    const votingSettingsSheet = doc.sheetsByTitle['Voting Settings'];
    await votingSettingsSheet.loadHeaderRow();
    const settingRows = await votingSettingsSheet.getRows();
    
    console.log(`\n⚙️  Voting Settings Sheet:`);
    console.log(`   Headers: ${votingSettingsSheet.headerValues.join(', ')}`);
    console.log(`   Total Settings: ${settingRows.length}`);
    
    if (settingRows.length > 0) {
      console.log('\n   Current Settings:');
      settingRows.forEach((row, index) => {
        // Get all values from the row
        const values = row._rawData;
        const setting = values[0] || 'N/A';
        const value = values[1] || 'N/A';
        const description = values[2] || 'N/A';
        
        console.log(`   ${index + 1}. ${setting}: ${value}`);
        console.log(`      Description: ${description}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Voting System Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   • ${proposalRows.length} proposals available for voting`);
    console.log(`   • ${voteRows.length} votes cast`);
    console.log(`   • ${resultRows.length} proposals with voting results`);
    console.log(`   • ${settingRows.length} voting settings configured`);
    
    // Calculate active proposals
    let activeProposals = 0;
    proposalRows.forEach(row => {
      const submissionDate = row.get('Submission Date');
      if (submissionDate) {
        const submission = new Date(submissionDate);
        const deadline = new Date(submission.getTime() + (30 * 24 * 60 * 60 * 1000));
        const now = new Date();
        if (now <= deadline) {
          activeProposals++;
        }
      }
    });
    
    console.log(`   • ${activeProposals} proposals with active voting`);
    console.log(`   • ${proposalRows.length - activeProposals} proposals with expired voting`);
    
    if (proposalRows.length > 0 && activeProposals > 0) {
      console.log('\n🎉 Voting system is ready for use!');
      console.log('   Users can now vote on active proposals through the "Vote for Proposals" page.');
    } else if (proposalRows.length === 0) {
      console.log('\n📝 No proposals found.');
      console.log('   Submit proposals through the "Requirement Documents" page to start voting.');
    } else {
      console.log('\n⏰ All proposals have expired voting periods.');
      console.log('   New proposals are needed for active voting.');
    }

  } catch (error) {
    console.error('❌ Error testing voting system:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n🌐 Network Error: Please check your internet connection.');
    } else if (error.message.includes('No key or keyFile')) {
      console.log('\n🔑 Authentication Error: Please check your Google service account credentials.');
    } else if (error.message.includes('Unable to parse')) {
      console.log('\n📋 Sheet Error: Please check if the Google Sheet ID is correct.');
    }
  }
}

if (require.main === module) {
  testVotingSystem();
}

module.exports = testVotingSystem;