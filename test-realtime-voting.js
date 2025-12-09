const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function testRealtimeVoting() {
  try {
    console.log('🧪 Testing Real-time Voting System...');
    
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    const votesSheet = doc.sheetsByTitle['Votes'];
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    const rdSheet = doc.sheetsByTitle['RD'];
    
    if (!votesSheet || !votingResultsSheet || !rdSheet) {
      console.log('❌ Required sheets not found');
      return;
    }
    
    console.log('\n📊 Current Vote Data:');
    
    // Get all votes
    const voteRows = await votesSheet.getRows();
    console.log(`Total votes in sheet: ${voteRows.length}`);
    
    // Group votes by proposal
    const votesByProposal = {};
    voteRows.forEach(row => {
      const proposalId = row.get('proposalId');
      const voteType = row.get('voteType');
      const userId = row.get('userId');
      
      if (!votesByProposal[proposalId]) {
        votesByProposal[proposalId] = {
          upvotes: 0,
          downvotes: 0,
          voters: new Set()
        };
      }
      
      if (voteType === 'upvote') {
        votesByProposal[proposalId].upvotes++;
      } else if (voteType === 'downvote') {
        votesByProposal[proposalId].downvotes++;
      }
      
      votesByProposal[proposalId].voters.add(userId);
    });
    
    // Display vote counts for each proposal
    Object.keys(votesByProposal).forEach(proposalId => {
      const data = votesByProposal[proposalId];
      const netScore = data.upvotes - data.downvotes;
      const voterCount = data.voters.size;
      
      console.log(`\n${proposalId}:`);
      console.log(`  👍 Upvotes: ${data.upvotes}`);
      console.log(`  👎 Downvotes: ${data.downvotes}`);
      console.log(`  📊 Net Score: ${netScore > 0 ? '+' : ''}${netScore}`);
      console.log(`  👥 Unique Voters: ${voterCount}`);
    });
    
    // Check voting results sheet
    console.log('\n📋 Voting Results Sheet:');
    const resultRows = await votingResultsSheet.getRows();
    console.log(`Total result entries: ${resultRows.length}`);
    
    resultRows.forEach(row => {
      const proposalId = row.get('proposalId');
      const upvotes = row.get('totalUpvotes');
      const downvotes = row.get('totalDownvotes');
      const voterCount = row.get('voterCount');
      
      console.log(`${proposalId}: ${upvotes}↑ ${downvotes}↓ (${voterCount} voters)`);
    });
    
    console.log('\n✅ Real-time voting test completed!');
    console.log('\n💡 Tips:');
    console.log('- Vote counts should appear immediately when switching accounts');
    console.log('- Refresh should show current vote totals');
    console.log('- User vote status should persist across sessions');
    
  } catch (error) {
    console.error('❌ Error testing real-time voting:', error.message);
  }
}

testRealtimeVoting();