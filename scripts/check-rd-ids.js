// Script to iterate RD tab and report on the ID column
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function checkRDIds() {
  try {
    console.log('Checking RD IDs...');

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

    console.log(`\n📊 Document: ${doc.title}`);
    console.log(`Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);

    const rdSheet = doc.sheetsByTitle['RD'];
    if (!rdSheet) {
      console.error('RD sheet not found.');
      return;
    }

    await rdSheet.loadHeaderRow();
    console.log(`\nRD Headers: ${rdSheet.headerValues.join(', ')}`);

    const rows = await rdSheet.getRows();
    console.log(`Total RD rows: ${rows.length}`);

    // Inspect mapping for first row (debug)
    if (rows.length > 0) {
      const first = rows[0];
      const keys = Object.keys(first).filter(k => !k.startsWith('_'));
      console.log(`\n🧩 First row property keys: ${keys.join(', ')}`);
      console.log(`First row raw data: ${JSON.stringify(first._rawData)}`);
    }

    let missingCount = 0;
    const idSet = new Set();
    const duplicates = [];
    const sample = [];

    for (const row of rows) {
      const id = (row.ID || '').toString().trim();
      const title = (row['Proposal Title'] || '').toString().trim();
      const reviewer = (row['Reviewer Name'] || '').toString().trim();

      if (!id) missingCount++;
      else if (idSet.has(id)) duplicates.push({ row: row._rowNumber, id });
      else idSet.add(id);

      if (sample.length < 10) {
        sample.push({ row: row._rowNumber, id: id || 'MISSING', title, reviewer });
      }
    }

    console.log('\n🔎 Sample of first 10 rows:');
    for (const s of sample) {
      console.log(`Row ${s.row}: ID=${s.id} | Title="${s.title}" | Reviewer="${s.reviewer}"`);
    }

    console.log(`\n✅ Unique ID count: ${idSet.size}`);
    console.log(`⚠️ Missing IDs: ${missingCount}`);
    console.log(`⚠️ Duplicate IDs: ${duplicates.length}`);
    if (duplicates.length > 0) {
      for (const d of duplicates.slice(0, 10)) {
        console.log(`  - Duplicate: ID=${d.id} at row ${d.row}`);
      }
      if (duplicates.length > 10) console.log('  ... (more duplicates omitted)');
    }

    // Report sequential check (PROP-###)
    const nums = Array.from(idSet)
      .map((id) => {
        const m = id.match(/^PROP-(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((n) => n !== null)
      .sort((a, b) => a - b);

    if (nums.length > 0) {
      const min = nums[0];
      const max = nums[nums.length - 1];
      console.log(`\n📈 Sequential ID range: ${String(min).padStart(3, '0')} → ${String(max).padStart(3, '0')}`);
    }

    console.log('\n✅ RD ID check complete.');
  } catch (err) {
    console.error('❌ Error checking RD IDs:', err.message || err);
  }
}

checkRDIds();