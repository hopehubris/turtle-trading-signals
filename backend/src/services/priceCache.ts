/**
 * Price Cache Service
 * 
 * Caches historical price data during a scan session to avoid redundant API calls
 * Allows multiple signal calculations (different systems/configs) against the same data
 */

import { OHLC } from '../types/index.js';

interface CacheEntry {
  data: OHLC[];
  fetchedAt: number;
}

class PriceCache {
  private cache: Map<string, CacheEntry> = new Map();
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;

  /**
   * Start a new cache session (e.g., beginning of a scan)
   */
  startSession(): string {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();
    this.cache.clear();
    console.log(`[PriceCache] Session started: ${this.sessionId}`);
    return this.sessionId;
  }

  /**
   * End the current cache session and clear all cached data
   */
  endSession(): void {
    if (!this.sessionId) return;
    
    const duration = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
    const cacheHits = Array.from(this.cache.values()).filter(
      entry => Date.now() - entry.fetchedAt < 60000 // Fetched during this session
    ).length;
    
    console.log(
      `[PriceCache] Session ended: ${this.sessionId} | Duration: ${duration}ms | Cached: ${this.cache.size} | Hits: ${cacheHits}`
    );
    
    this.sessionId = null;
    this.sessionStartTime = null;
    this.cache.clear();
  }

  /**
   * Store price data in cache
   */
  set(ticker: string, data: OHLC[]): void {
    if (!this.sessionId) {
      console.warn(`[PriceCache] No active session, skipping cache for ${ticker}`);
      return;
    }

    this.cache.set(ticker, {
      data,
      fetchedAt: Date.now(),
    });
    console.log(`[PriceCache] Cached ${ticker}: ${data.length} bars`);
  }

  /**
   * Retrieve price data from cache
   * Returns null if not cached or cache is stale
   */
  get(ticker: string): OHLC[] | null {
    if (!this.sessionId) {
      return null;
    }

    const entry = this.cache.get(ticker);
    if (!entry) {
      return null;
    }

    // Cache is valid for 5 minutes within a session
    const age = Date.now() - entry.fetchedAt;
    if (age > 300000) {
      this.cache.delete(ticker);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if ticker is cached
   */
  has(ticker: string): boolean {
    return this.cache.has(ticker) && this.get(ticker) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      sessionId: this.sessionId,
      sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0,
      cachedTickers: this.cache.size,
      details: Array.from(this.cache.entries()).map(([ticker, entry]) => ({
        ticker,
        bars: entry.data.length,
        age: Date.now() - entry.fetchedAt,
      })),
    };
  }

  /**
   * Clear all cache (manual reset)
   */
  clear(): void {
    this.cache.clear();
    console.log('[PriceCache] Cache cleared manually');
  }
}

// Singleton instance
export const priceCache = new PriceCache();
