// Cell-level backfill for RD sheet ID column
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function backfillRDIdsCells() {
  try {
    console.log('Starting RD ID backfill (cells)...');

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
      console.error('RD sheet not found.');
      return;
    }

    await rdSheet.loadHeaderRow();
    const headers = rdSheet.headerValues || [];
    console.log('RD headers:', headers.join(', '));
    if (!headers.includes('ID')) {
      // Put ID at the start to make column A
      await rdSheet.setHeaderRow(['ID', ...headers]);
      console.log('Inserted ID header at column A.');
      await rdSheet.loadHeaderRow();
    }

    const rows = await rdSheet.getRows();
    console.log(`Total RD rows: ${rows.length}`);

    // Load ID column cells (A) for all existing row numbers
    const maxRow = Math.max(...rows.map(r => r._rowNumber), 2);
    const rangeA1 = `A2:A${maxRow}`;
    await rdSheet.loadCells(rangeA1);

    // Gather used numbers
    const usedNumbers = new Set();
    for (const row of rows) {
      const rIndexZero = row._rowNumber - 1; // zero-based index
      const cell = rdSheet.getCell(rIndexZero, 0); // column A = index 0
      const val = (cell.value || '').toString().trim();
      const m = val.match(/^PROP-(\d+)$/);
      if (m) usedNumbers.add(parseInt(m[1], 10));
    }

    // Helper for next sequential
    const getNextSeq = (() => {
      let next = 1;
      while (usedNumbers.has(next)) next++;
      return () => {
        while (usedNumbers.has(next)) next++;
        usedNumbers.add(next);
        return next++;
      };
    })();

    let updates = 0;
    for (const row of rows) {
      const rIndexZero = row._rowNumber - 1;
      const cell = rdSheet.getCell(rIndexZero, 0);
      const val = (cell.value || '').toString().trim();
      if (!val) {
        const seq = getNextSeq();
        const id = `PROP-${String(seq).padStart(3, '0')}`;
        cell.value = id;
        updates++;
        if (updates <= 40) {
          console.log(`Set row ${row._rowNumber} ID to ${id}`);
        }
      }
    }

    if (updates > 0) {
      await rdSheet.saveUpdatedCells();
      console.log(`\n✅ Cell-level backfill complete. Updated ${updates} rows.`);
    } else {
      console.log('\n✅ Nothing to update. All IDs present.');
    }
  } catch (err) {
    console.error('❌ Error during cell-level RD ID backfill:', err.message || err);
  }
}

backfillRDIdsCells();