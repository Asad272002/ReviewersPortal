interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    const isExpired = (now - item.timestamp) > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    const isExpired = (now - item.timestamp) > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, item] of this.cache.entries()) {
      const isExpired = (now - item.timestamp) > item.ttl;
      if (isExpired) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries
    };
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      const isExpired = (now - item.timestamp) > item.ttl;
      if (isExpired) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
  PROPOSALS: 'proposals',
  VOTING_RESULTS: 'voting_results',
  VOTES: 'votes',
  VOTING_SETTINGS: 'voting_settings',
  PROPOSALS_WITH_VOTES: (userId?: string) => `proposals_with_votes_${userId || 'anonymous'}`
} as const;

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  PROPOSALS: 2 * 60 * 1000,      // 2 minutes for proposals
  VOTING_RESULTS: 30 * 1000,     // 30 seconds for voting results
  VOTES: 15 * 1000,              // 15 seconds for votes (most dynamic)
  VOTING_SETTINGS: 10 * 60 * 1000, // 10 minutes for settings
  PROPOSALS_WITH_VOTES: 30 * 1000  // 30 seconds for combined data
} as const;