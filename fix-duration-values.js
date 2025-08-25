const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function fixDurationValues() {
  try {
    console.log('Fixing duration values in Announcements sheet...');
    
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
    
    const announcementsSheet = doc.sheetsByTitle['Announcements'];
    if (!announcementsSheet) {
      throw new Error('Announcements sheet not found');
    }

    // Load all rows
    const rows = await announcementsSheet.getRows();
    console.log(`Found ${rows.length} announcements`);
    
    let updatedCount = 0;
    
    for (const row of rows) {
      const currentDuration = row.get('duration');
      const title = row.get('title');
      
      console.log(`Checking announcement: "${title}" - Duration: ${currentDuration}`);
      
      // Fix duration values that are unreasonably high (like 2025)
      if (currentDuration && parseInt(currentDuration) > 365) {
        console.log(`  Fixing duration from ${currentDuration} to 30 days`);
        row.set('duration', '30');
        
        // Also recalculate expiresAt based on createdAt + 30 days
        const createdAt = row.get('createdAt');
        if (createdAt) {
          try {
            // Parse the custom date format: "August 24, 2025 at 01:23 PM UTC"
            const cleanedDate = createdAt.replace(' UTC', '').replace(' at ', ' ');
            const createdDate = new Date(cleanedDate);
            
            if (!isNaN(createdDate.getTime())) {
              const expiresDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
              const formattedExpires = expiresDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'UTC'
              }).replace(' at ', ' at ') + ' UTC';
              
              console.log(`  Updating expiresAt to: ${formattedExpires}`);
              row.set('expiresAt', formattedExpires);
            }
          } catch (error) {
            console.log(`  Could not parse createdAt date: ${createdAt}`);
          }
        }
        
        await row.save();
        updatedCount++;
      }
    }
    
    console.log(`\nFixed ${updatedCount} announcements with incorrect duration values.`);
    
  } catch (error) {
    console.error('Error fixing duration values:', error);
  }
}

fixDurationValues();