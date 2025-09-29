import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Initialize Google Sheets client
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);

// Cache for settings to avoid frequent API calls
let settingsCache: { [key: string]: string } = {};
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getVotingSetting(settingKey: string, defaultValue: string = ''): Promise<string> {
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - lastCacheUpdate < CACHE_DURATION && settingsCache[settingKey]) {
      return settingsCache[settingKey];
    }

    await doc.loadInfo();
    
    // Get Voting Settings sheet
    let votingSettingsSheet = doc.sheetsByTitle['Voting Settings'];
    if (!votingSettingsSheet) {
      // Create sheet with default settings if it doesn't exist
      votingSettingsSheet = await doc.addSheet({
        title: 'Voting Settings',
        headerValues: ['settingKey', 'settingValue', 'description', 'updatedAt']
      });
      
      const defaultSettings = [
        {
          'settingKey': 'voting_duration_days',
          'settingValue': '30',
          'description': 'Number of days a proposal remains open for voting',
          'updatedAt': new Date().toISOString()
        },
        {
          'settingKey': 'allow_vote_changes',
          'settingValue': 'TRUE',
          'description': 'Allow users to change their votes on proposals',
          'updatedAt': new Date().toISOString()
        },
        {
          'settingKey': 'min_votes_required',
          'settingValue': '5',
          'description': 'Minimum number of votes required for a proposal to be considered',
          'updatedAt': new Date().toISOString()
        }
      ];
      
      await votingSettingsSheet.addRows(defaultSettings);
    }

    const rows = await votingSettingsSheet.getRows();
    
    // Update cache with all settings
    settingsCache = {};
    rows.forEach(row => {
      const key = row.get('settingKey');
      const value = row.get('settingValue');
      if (key && value !== undefined) {
        settingsCache[key] = value;
      }
    });
    
    lastCacheUpdate = now;
    
    return settingsCache[settingKey] || defaultValue;

  } catch (error) {
    console.error('Error fetching voting setting:', error);
    return defaultValue;
  }
}

export async function getVotingDurationDays(): Promise<number> {
  const durationStr = await getVotingSetting('voting_duration_days', '30');
  const duration = parseInt(durationStr);
  return isNaN(duration) ? 30 : Math.max(1, Math.min(365, duration));
}

export async function getAllowVoteChanges(): Promise<boolean> {
  const allowStr = await getVotingSetting('allow_vote_changes', 'TRUE');
  return allowStr.toUpperCase() === 'TRUE';
}

export async function getMinVotesRequired(): Promise<number> {
  const minStr = await getVotingSetting('min_votes_required', '5');
  const min = parseInt(minStr);
  return isNaN(min) ? 5 : Math.max(1, Math.min(100, min));
}