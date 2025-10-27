import { supabaseAdmin } from '@/lib/supabase/server';

// Cache for settings to avoid frequent API calls
let settingsCache: { [key: string]: string } = {};
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for Voting Settings History to reduce read requests
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

    // Serve from cache if fresh
    if (now - lastCacheUpdate < CACHE_DURATION && settingsCache[settingKey]) {
      return settingsCache[settingKey];
    }

    const { data, error } = await supabaseAdmin
      .from('voting_setting')
      .select('*');

    if (error) {
      console.error('Supabase getVotingSetting error:', error);
      return settingsCache[settingKey] || defaultValue;
    }

    // Update cache with all settings
    settingsCache = {};
    (data || []).forEach((row: any) => {
      const key = row.setting_key ?? row.settingKey;
      const value = row.setting_value ?? row.settingValue;
      if (key && value !== undefined) {
        settingsCache[String(key)] = String(value);
      }
    });
    lastCacheUpdate = now;

    return settingsCache[settingKey] || defaultValue;
  } catch (err) {
    console.error('Error fetching voting setting:', err);
    return defaultValue;
  }
}

// Fresh (no-cache) fetch for settings
export async function getVotingSettingFresh(settingKey: string, defaultValue: string = ''): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from('voting_setting')
      .select('*');

    if (error) {
      console.error('Supabase getVotingSettingFresh error:', error);
      return defaultValue;
    }

    const tempMap: { [key: string]: string } = {};
    (data || []).forEach((row: any) => {
      const key = row.setting_key ?? row.settingKey;
      const value = row.setting_value ?? row.settingValue;
      if (key && value !== undefined) {
        tempMap[String(key)] = String(value);
      }
    });

    return tempMap[settingKey] || defaultValue;
  } catch (err) {
    console.error('Error fetching voting setting (fresh):', err);
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
  return String(allowStr).toUpperCase() === 'TRUE';
}

export async function getMinVotesRequired(): Promise<number> {
  const minStr = await getVotingSetting('min_votes_required', '5');
  const min = parseInt(minStr);
  return isNaN(min) ? 5 : Math.max(1, Math.min(100, min));
}

// Internal: Load and cache history entries with TTL
async function getDurationHistoryEntries(): Promise<DurationHistoryEntry[]> {
  const now = Date.now();
  // Serve from cache if fresh
  if (now - historyCache.lastCacheUpdate < HISTORY_CACHE_TTL && historyCache.entries.length >= 0) {
    return historyCache.entries;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('voting_setting_history')
      .select('*');

    if (error) {
      console.error('Supabase getDurationHistoryEntries error:', error);
      // Return cached entries if available, else empty
      if (historyCache.entries.length > 0) return historyCache.entries;
      historyCache = { entries: [], lastCacheUpdate: now };
      return historyCache.entries;
    }

    const filtered = (data || []).filter((row: any) => {
      const key = row.setting_key ?? row.settingKey;
      return String(key) === 'voting_duration_days';
    });

    const entries: DurationHistoryEntry[] = filtered
      .map((row: any) => {
        const effStr = String(row.effective_at || row.effectiveAt || row.updated_at || row.updatedAt || '');
        const eff = new Date(effStr);
        return {
          effectiveAtMs: isNaN(eff.getTime()) ? 0 : eff.getTime(),
          oldValue: String(row.old_value ?? row.oldValue ?? ''),
          newValue: String(row.new_value ?? row.newValue ?? ''),
        };
      })
      .filter((e) => e.effectiveAtMs > 0)
      .sort((a, b) => a.effectiveAtMs - b.effectiveAtMs);

    historyCache = { entries, lastCacheUpdate: now };
    return entries;
  } catch (err) {
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
    const firstAfter = entries.find((e) => e.effectiveAtMs > target);
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