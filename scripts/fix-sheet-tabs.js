// Script to fix duplicate tabs and update Reviewers tab structure
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function fixSheetTabs() {
  try {
    console.log('Connecting to Google Sheets...');
    
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
    
    console.log('\n📊 Current Sheet Structure:');
    console.log(`Document Title: ${doc.title}`);
    console.log(`Total Number of Tabs: ${doc.sheetCount}`);
    
    // Find duplicate tabs
    const duplicatesToRemove = [];
    const tabsToKeep = [];
    
    for (let i = 0; i < doc.sheetCount; i++) {
      const sheet = doc.sheetsByIndex[i];
      console.log(`${i + 1}. "${sheet.title}" (ID: ${sheet.sheetId})`);
      
      // Identify duplicates to remove (keep the newer structure)
      if (sheet.title === 'AwardedTeams') {
        duplicatesToRemove.push({ sheet, reason: 'Duplicate - keeping "Awarded Teams" instead' });
      } else if (sheet.title === 'TeamReviewerAssignments') {
        duplicatesToRemove.push({ sheet, reason: 'Duplicate - keeping "Team Reviewer Assignments" instead' });
      } else {
        tabsToKeep.push(sheet);
      }
    }
    
    console.log('\n🔍 Analysis Results:');
    console.log(`Tabs to keep: ${tabsToKeep.length}`);
    console.log(`Duplicate tabs to remove: ${duplicatesToRemove.length}`);
    
    // Remove duplicate tabs
    if (duplicatesToRemove.length > 0) {
      console.log('\n🗑️ Removing duplicate tabs...');
      for (const { sheet, reason } of duplicatesToRemove) {
        console.log(`Removing "${sheet.title}" - ${reason}`);
        await sheet.delete();
        console.log(`✓ Removed "${sheet.title}"`);
      }
    }
    
    // Reload document info after deletions
    await doc.loadInfo();
    
    // Find and update the Reviewers tab
    const reviewersSheet = doc.sheetsByTitle['Reviewers'];
    if (reviewersSheet) {
      console.log('\n📝 Updating Reviewers tab structure...');
      
      // Clear existing headers and data
      await reviewersSheet.clear();
      
      // Set new headers according to the required structure
      await reviewersSheet.setHeaderRow([
        'NAME',
        'MATTERMOST ID', 
        'EMAIL',
        'Github ID\'s',
        'CV link',
        'Expertise'
      ]);
      
      console.log('✓ Updated Reviewers tab with new structure:');
      console.log('  - NAME');
      console.log('  - MATTERMOST ID');
      console.log('  - EMAIL');
      console.log('  - Github ID\'s');
      console.log('  - CV link');
      console.log('  - Expertise');
    } else {
      console.log('\n⚠️ Reviewers tab not found - creating it...');
      const newReviewersSheet = await doc.addSheet({ title: 'Reviewers' });
      await newReviewersSheet.setHeaderRow([
        'NAME',
        'MATTERMOST ID',
        'EMAIL', 
        'Github ID\'s',
        'CV link',
        'Expertise'
      ]);
      console.log('✓ Created new Reviewers tab with correct structure');
    }
    
    console.log('\n📋 Final Sheet Structure:');
    await doc.loadInfo(); // Reload to get updated sheet list
    for (let i = 0; i < doc.sheetCount; i++) {
      const sheet = doc.sheetsByIndex[i];
      await sheet.loadHeaderRow();
      console.log(`${i + 1}. "${sheet.title}"`);
      console.log(`   Headers: ${sheet.headerValues.join(', ')}`);
    }
    
    console.log('\n✅ Sheet cleanup and update completed successfully!');
    console.log('\nSummary of changes:');
    console.log('- Removed duplicate "AwardedTeams" tab (kept "Awarded Teams")');
    console.log('- Removed duplicate "TeamReviewerAssignments" tab (kept "Team Reviewer Assignments")');
    console.log('- Updated "Reviewers" tab with new field structure');
    console.log('\nThe Google Sheet is now properly organized!');
    
  } catch (error) {
    console.error('❌ Error fixing sheet tabs:', error.message);
    console.error('Full error:', error);
  }
}

fixSheetTabs();