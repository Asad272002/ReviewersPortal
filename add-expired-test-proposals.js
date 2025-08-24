const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function addExpiredTestProposals() {
  try {
    console.log('Adding expired test proposals to Google Sheets...');
    
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    // Get the RD (Requirement Documents) sheet
    const rdSheet = doc.sheetsByTitle['RD'];
    if (!rdSheet) {
      console.error('RD sheet not found!');
      return;
    }
    
    // Create submission dates that are 35+ days old (definitely expired)
    const now = new Date();
    const expiredDate1 = new Date(now.getTime() - (35 * 24 * 60 * 60 * 1000)); // 35 days ago
    const expiredDate2 = new Date(now.getTime() - (45 * 24 * 60 * 60 * 1000)); // 45 days ago
    
    // Format dates in the expected format: "Month Day, Year at HH:MM AM/PM UTC"
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      }).replace(' at ', ' at ') + ' UTC';
    };
    
    // Add first expired test proposal
    await rdSheet.addRow({
      'Reviewer Name': 'Test User',
      'Proposal Title': 'TRULY EXPIRED TEST - Cannot Vote',
      'Project Category': 'Testing - Expired',
      'Team Size': '1 members',
      'Budget Estimate': '$0',
      'Timeline (Weeks)': '1 weeks',
      'Proposal Summary': 'This proposal has a submission date of 35 days ago, making it truly expired. Voting should be completely disabled.',
      'Technical Approach': 'Testing expired voting functionality with proper date calculation.',
      'Additional Notes': '',
      'Submission Date': formatDate(expiredDate1)
    });
    
    // Add second expired test proposal
    await rdSheet.addRow({
      'Reviewer Name': 'Test User',
      'Proposal Title': 'EXPIRED TEST - Voting Period Ended',
      'Project Category': 'Testing',
      'Team Size': '1 members',
      'Budget Estimate': '$0',
      'Timeline (Weeks)': '1 weeks',
      'Proposal Summary': 'hen you land on a sample web page or open an email template and see content beginning with "lorem ipsum," the page creator placed that apparent gibberish there on purpose. Page layouts look better ...',
      'Technical Approach': 'Testing expired voting functionality',
      'Additional Notes': '',
      'Submission Date': formatDate(expiredDate2)
    });
    
    console.log('✓ Added expired test proposals with dates:');
    console.log('  - Current date:', now.toISOString());
    console.log('  - Expired date 1 (35 days ago):', expiredDate1.toISOString());
    console.log('  - Expired date 2 (45 days ago):', expiredDate2.toISOString());
    console.log('  - Formatted date 1:', formatDate(expiredDate1));
    console.log('  - Formatted date 2:', formatDate(expiredDate2));
    console.log('\nThese proposals should now show as expired with 00:00:00:00 countdown.');
    
  } catch (error) {
    console.error('Error adding expired test proposals:', error.message);
  }
}

addExpiredTestProposals();