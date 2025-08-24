// Script to clean up duplicate guide entries with simple numeric IDs
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function cleanupDuplicates() {
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
    
    // Connect to the existing document
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    console.log(`Connected to Google Sheet: ${doc.title}`);
    
    // Get the Guides sheet
    const guidesSheet = doc.sheetsByTitle['Guides'];
    if (!guidesSheet) {
      console.log('Guides sheet not found. Nothing to clean up.');
      return;
    }
    
    // Get all rows
    const rows = await guidesSheet.getRows();
    console.log(`Found ${rows.length} guide entries`);
    
    // Track which rows to delete (simple numeric IDs or duplicates)
    const rowsToDelete = [];
    const seenIds = new Set();
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = row.get('id');
      
      // Check if ID is a simple numeric value (1, 2, 3, etc.) or if we've seen this ID before
      if (/^\d+$/.test(id) || seenIds.has(id)) {
        console.log(`Marking row ${i + 1} for deletion - ID: '${id}', Title: '${row.get('title')}'`);
        rowsToDelete.push(row);
      } else {
        seenIds.add(id);
      }
    }
    
    if (rowsToDelete.length === 0) {
      console.log('No duplicate or problematic entries found. Sheet is clean!');
      return;
    }
    
    console.log(`\nFound ${rowsToDelete.length} entries to delete`);
    console.log('Deleting duplicate and problematic entries...');
    
    // Delete rows (in reverse order to avoid index shifting issues)
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      await rowsToDelete[i].delete();
      console.log(`Deleted entry ${i + 1}/${rowsToDelete.length}`);
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log('The React key error should now be resolved.');
    console.log('\nRemaining guides:');
    
    // Show remaining guides
    const remainingRows = await guidesSheet.getRows();
    remainingRows.forEach((row, index) => {
      console.log(`${index + 1}. ID: '${row.get('id')}', Title: '${row.get('title')}'`);
    });
    
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
  }
}

cleanupDuplicates();