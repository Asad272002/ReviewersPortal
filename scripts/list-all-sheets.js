// Script to list all sheets/tabs in the Google Spreadsheet
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function listAllSheets() {
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
    
    console.log('\n📊 Google Sheet Information:');
    console.log(`Document Title: ${doc.title}`);
    console.log(`Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
    console.log(`Total Number of Tabs/Worksheets: ${doc.sheetCount}`);
    
    console.log('\n📋 List of All Tabs/Worksheets:');
    
    for (let i = 0; i < doc.sheetCount; i++) {
      const sheet = doc.sheetsByIndex[i];
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();
      
      console.log(`\n${i + 1}. Tab Name: "${sheet.title}"`);
      console.log(`   - Sheet ID: ${sheet.sheetId}`);
      console.log(`   - Headers: ${sheet.headerValues.join(', ')}`);
      console.log(`   - Number of Rows: ${rows.length}`);
      console.log(`   - Grid Properties: ${sheet.gridProperties.rowCount} rows x ${sheet.gridProperties.columnCount} columns`);
    }
    
    console.log('\n✅ Complete sheet analysis finished!');
    
  } catch (error) {
    console.error('❌ Error listing sheets:', error.message);
  }
}

listAllSheets();