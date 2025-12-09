// Script to backfill missing IDs in the RD sheet and ensure header exists
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function backfillRDIds() {
  try {
    console.log('Starting RD ID backfill...');

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

    const rdSheet = doc.sheetsByTitle['RD'];
    if (!rdSheet) {
      console.error('RD sheet not found. Please ensure the RD tab exists.');
      return;
    }

    // Ensure ID header exists and is appended (to avoid column shift)
    await rdSheet.loadHeaderRow();
    const headers = rdSheet.headerValues || [];
    if (!headers.includes('ID')) {
      await rdSheet.setHeaderRow([...headers, 'ID']);
      console.log('Appended ID to RD headers.');
    } else {
      console.log('ID header already present in RD.');
    }

    const rows = await rdSheet.getRows();
    console.log(`Total RD rows: ${rows.length}`);

    // Collect used numeric suffixes for PROP-XXX to avoid collisions
    const usedNumbers = new Set();
    for (const row of rows) {
      const val = (row.ID || '').toString().trim();
      const match = val.match(/^PROP-(\d+)$/);
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    }

    // Helper to get next available sequential number (starting at 1)
    const getNextSeq = (() => {
      let next = 1;
      while (usedNumbers.has(next)) next++;
      return () => {
        while (usedNumbers.has(next)) next++;
        usedNumbers.add(next);
        return next++;
      };
    })();

    let updatedCount = 0;
    for (const row of rows) {
      const val = (row.ID || '').toString().trim();
      if (!val) {
        const seq = getNextSeq();
        const id = `PROP-${String(seq).padStart(3, '0')}`;
        row.ID = id;
        await row.save();
        updatedCount++;
        console.log(`Backfilled row ${row._rowNumber} with ID ${id}`);
      }
    }

    console.log(`\n✅ Backfill complete. Updated ${updatedCount} rows.`);
  } catch (err) {
    console.error('❌ Error during RD ID backfill:', err.message || err);
  }
}

backfillRDIds();