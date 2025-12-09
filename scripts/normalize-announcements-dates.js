// Script to normalize existing non-ISO expiresAt values in the Announcements sheet to ISO 8601 strings
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

function isISODateString(str) {
  if (typeof str !== 'string') return false;
  // Simple check for ISO 8601 format ending in Z
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(str);
}

function tryParseCustomUTC(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  if (!s) return null;

  // Pattern: Month Day, Year at HH:MM AM/PM UTC
  const monthNames = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  const reFull = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})(?:\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*UTC)?$/;
  const mFull = s.match(reFull);
  if (mFull) {
    const monthName = mFull[1].toLowerCase();
    const day = parseInt(mFull[2], 10);
    const year = parseInt(mFull[3], 10);
    const monthIndex = monthNames[monthName];
    if (monthIndex === undefined) return null;

    let hour = 0;
    let minute = 0;
    if (mFull[4] && mFull[5] && mFull[6]) {
      hour = parseInt(mFull[4], 10);
      minute = parseInt(mFull[5], 10);
      const ampm = mFull[6].toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
    }
    const date = new Date(Date.UTC(year, monthIndex, day, hour, minute, 0));
    return isNaN(date.getTime()) ? null : date;
  }

  // Pattern: Month Day, Year (no time, treat as UTC midnight)
  const reDate = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/;
  const mDate = s.match(reDate);
  if (mDate) {
    const monthName = mDate[1].toLowerCase();
    const day = parseInt(mDate[2], 10);
    const year = parseInt(mDate[3], 10);
    const monthIndex = monthNames[monthName];
    if (monthIndex === undefined) return null;
    const date = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0));
    return isNaN(date.getTime()) ? null : date;
  }

  // Pattern: MM/DD/YYYY or M/D/YYYY (US style) — interpret as UTC midnight
  const reUS = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const mUS = s.match(reUS);
  if (mUS) {
    const month = parseInt(mUS[1], 10);
    const day = parseInt(mUS[2], 10);
    const year = parseInt(mUS[3], 10);
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    return isNaN(date.getTime()) ? null : date;
  }

  // Fallback: let JS try to parse; if valid, use its UTC ISO
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

async function normalizeAnnouncementsExpiresAt() {
  try {
    console.log('Connecting to Google Sheets...');
    const { GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing required environment variables (GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)');
    }

    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Announcements'];
    if (!sheet) throw new Error('Announcements sheet not found');

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    if (!headers.includes('expiresAt')) {
      throw new Error('Announcements sheet missing "expiresAt" column');
    }

    const rows = await sheet.getRows();
    console.log(`Found ${rows.length} announcement rows. Starting normalization...`);

    let updatedCount = 0;
    let skippedCount = 0;
    let alreadyISOCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      const id = row.get('id');
      const raw = row.get('expiresAt');
      if (!raw) {
        skippedCount++;
        continue;
      }

      if (isISODateString(raw)) {
        alreadyISOCount++;
        continue;
      }

      const parsed = tryParseCustomUTC(raw);
      if (parsed) {
        const iso = parsed.toISOString();
        if (iso !== raw) {
          try {
            row.set('expiresAt', iso);
            await row.save();
            updatedCount++;
            console.log(`✓ Updated id=${id} expiresAt: "${raw}" -> "${iso}"`);
          } catch (err) {
            failedCount++;
            console.warn(`❌ Failed to save id=${id}:`, err?.message || err);
          }
        } else {
          // Shouldn't happen often, but count as alreadyISO
          alreadyISOCount++;
        }
      } else {
        failedCount++;
        console.warn(`⚠ Could not parse expiresAt for id=${id}: "${raw}"`);
      }
    }

    console.log('\nNormalization complete.');
    console.log(`- Updated: ${updatedCount}`);
    console.log(`- Already ISO: ${alreadyISOCount}`);
    console.log(`- Skipped (empty): ${skippedCount}`);
    console.log(`- Failed to parse/save: ${failedCount}`);
  } catch (error) {
    console.error('Error normalizing announcements dates:', error.message);
    process.exitCode = 1;
  }
}

normalizeAnnouncementsExpiresAt();