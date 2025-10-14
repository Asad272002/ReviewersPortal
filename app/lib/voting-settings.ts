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

// Cache for Voting Settings History to reduce read requests and avoid 429s
type DurationHistoryEntry = { effectiveAtMs: number; oldValue: string; newValue: string };
let historyCache: { entries: DurationHistoryEntry[]; lastCacheUpdate: number } = { entries: [], lastCacheUpdate: 0 };
const HISTORY_CACHE_TTL = 60 * 1000; // 60 seconds

export function invalidateVotingSettingsCache() {
  // Clear cache so new submissions immediately use the latest settings
  settingsCache = {};
  lastCacheUpdate = 0;
}

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

// Fresh (no-cache) fetch for settings
export async function getVotingSettingFresh(settingKey: string, defaultValue: string = ''): Promise<string> {
  try {
    await doc.loadInfo();
    
    let votingSettingsSheet = doc.sheetsByTitle['Voting Settings'];
    if (!votingSettingsSheet) {
      votingSettingsSheet = await doc.addSheet({
        title: 'Voting Settings',
        headerValues: ['settingKey', 'settingValue', 'description', 'updatedAt']
      });
    }

    const rows = await votingSettingsSheet.getRows();

    // Build a temporary map instead of using cache
    const tempMap: { [key: string]: string } = {};
    rows.forEach(row => {
      const key = row.get('settingKey');
      const value = row.get('settingValue');
      if (key && value !== undefined) {
        tempMap[key] = value;
      }
    });

    return tempMap[settingKey] || defaultValue;
  } catch (error) {
    console.error('Error fetching voting setting (fresh):', error);
    return defaultValue;
  }
}

export async function getVotingDurationDays(): Promise<number> {
  const durationStr = await getVotingSetting('voting_duration_days', '30');
  const duration = parseInt(durationStr);
  return isNaN(duration) ? 30 : Math.max(1, Math.min(365, duration));
}

// Fresh (no-cache) helper for submission time
export async function getVotingDurationDaysFresh(): Promise<number> {
  const durationStr = await getVotingSettingFresh('voting_duration_days', '30');
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

// Internal: Load and cache history entries with TTL and graceful fallback on 429
async function getDurationHistoryEntries(): Promise<DurationHistoryEntry[]> {
  const now = Date.now();
  // Serve from cache if fresh
  if (now - historyCache.lastCacheUpdate < HISTORY_CACHE_TTL && historyCache.entries.length >= 0) {
    return historyCache.entries;
  }

  try {
    await doc.loadInfo();
    const historySheet = doc.sheetsByTitle['Voting Settings History'];

    if (!historySheet) {
      // Cache empty to avoid repeated load attempts
      historyCache = { entries: [], lastCacheUpdate: now };
      return historyCache.entries;
    }

    const rows = await historySheet.getRows();
    const entries: DurationHistoryEntry[] = rows
      .filter(row => String(row.get('settingKey') || '').trim() === 'voting_duration_days')
      .map(row => {
        const effStr = String(row.get('effectiveAt') || row.get('updatedAt') || '');
        const eff = new Date(effStr);
        return {
          effectiveAtMs: isNaN(eff.getTime()) ? 0 : eff.getTime(),
          oldValue: String(row.get('oldValue') || ''),
          newValue: String(row.get('newValue') || '')
        };
      })
      .filter(e => e.effectiveAtMs > 0)
      .sort((a, b) => a.effectiveAtMs - b.effectiveAtMs);

    historyCache = { entries, lastCacheUpdate: now };
    return entries;
  } catch (error) {
    // On rate limit or error, return cached entries if available, otherwise empty
    if (historyCache.entries.length > 0) {
      return historyCache.entries;
    }
    return [];
  }
}


export async function getVotingDurationDaysAt(at: Date): Promise<number> {
  try {
    const entries = await getDurationHistoryEntries();

    // No entries recorded yet -> assume current or cached setting has been effective
    if (entries.length === 0) {
      // Prefer cached value if available to avoid extra loads
      const cached = settingsCache['voting_duration_days'];
      const cachedVal = parseInt(cached || '');
      if (!isNaN(cachedVal)) {
        return Math.max(1, Math.min(365, cachedVal));
      }
      const current = await getVotingDurationDays();
      return current;
    }

    const target = at.getTime();

    // Find the first change after the target date; before that, the oldValue was effective
    const firstAfter = entries.find(e => e.effectiveAtMs > target);
    if (firstAfter) {
      const oldVal = parseInt(firstAfter.oldValue);
      if (!isNaN(oldVal)) {
        return Math.max(1, Math.min(365, oldVal));
      }
      const fallbackNew = parseInt(firstAfter.newValue);
      if (!isNaN(fallbackNew)) {
        return Math.max(1, Math.min(365, fallbackNew));
      }
      const current = await getVotingDurationDays();
      return current;
    }

    // Otherwise, after the last recorded change, the last newValue applies
    const last = entries[entries.length - 1];
    const newVal = parseInt(last.newValue);
    if (!isNaN(newVal)) {
      return Math.max(1, Math.min(365, newVal));
    }
    const current = await getVotingDurationDays();
    return current;
  } catch (error) {
    console.error('Error determining voting duration for date:', error);
    const current = await getVotingDurationDays();
    return current;
  }
}

// Expose a lightweight check so callers can decide whether to persist backfills
export async function hasVotingDurationHistory(): Promise<boolean> {
  try {
    const entries = await getDurationHistoryEntries();
    return entries.length > 0;
  } catch {
    return false;
  }
}