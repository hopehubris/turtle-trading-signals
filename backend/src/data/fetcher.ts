import axios, { AxiosInstance } from 'axios';
import { OHLC } from '../types/index.js';
import { getRussell2000Tickers as getRussell2000TickerList } from './russell2000.js';

/**
 * Data fetcher interface for pluggable data sources
 */
export interface IDataFetcher {
  getHistoricalData(
    ticker: string,
    days: number
  ): Promise<OHLC[]>;
  getRussell2000Tickers(): Promise<string[]>;
}

/**
 * Yahoo Finance data fetcher
 * Fallback provider for OHLC data
 * 
 * Note: Yahoo Finance free API works but has occasional rate limiting.
 * Fallback to cached tickers if needed.
 */
export class YahooFinanceFetcher implements IDataFetcher {
  private baseUrl = 'https://query1.finance.yahoo.com/v7/finance/download';
  private maxRetries = 3;
  private retryDelayMs = 1000;

  async getHistoricalData(
    ticker: string,
    days: number
  ): Promise<OHLC[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Yahoo Finance API endpoint
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const url = `${this.baseUrl}/${ticker}?period1=${Math.floor(startDate.getTime() / 1000)}&period2=${Math.floor(endDate.getTime() / 1000)}&interval=1d&events=history`;

        const response = await axios.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          timeout: 5000,
        });

        const parsed = this.parseYahooCSV(response.data);
        
        // Validate we got enough data
        if (parsed.length < 21) {
          throw new Error(`Insufficient data for ${ticker}: only ${parsed.length} days available`);
        }

        return parsed;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          console.warn(`[Yahoo Finance] Attempt ${attempt} failed for ${ticker}. Retrying in ${this.retryDelayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }

    throw new Error(
      `Failed to fetch data for ${ticker} after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  async getRussell2000Tickers(): Promise<string[]> {
    // Use the cached Russell 2000 list from russell2000.ts
    return getRussell2000TickerList();
  }

  private parseYahooCSV(csv: string): OHLC[] {
    const lines = csv
      .split('\n')
      .filter((line) => line.trim().length > 0);
    const data: OHLC[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 6) continue;

      const date = parts[0];
      const open = parseFloat(parts[1]);
      const high = parseFloat(parts[2]);
      const low = parseFloat(parts[3]);
      const close = parseFloat(parts[4]);
      const adjClose = parseFloat(parts[5]);
      const volume = parseInt(parts[6], 10);

      // Skip if any values are invalid
      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
        continue;
      }

      data.push({
        date,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    // Sort by date ascending
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return data;
  }
}

/**
 * Polygon IO data fetcher (premium, requires API key)
 */
export class PolygonIOFetcher implements IDataFetcher {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io/v1/open-close';
  private tickersUrl = 'https://api.polygon.io/v3/reference/tickers';
  private maxRetries = 3;
  private retryDelayMs = 500;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getHistoricalData(
    ticker: string,
    days: number
  ): Promise<OHLC[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const data: OHLC[] = [];
        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - days * 24 * 60 * 60 * 1000
        );

        // Fetch each day individually (Polygon API limitation)
        // But be smart about weekends
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Skip weekends
          if (d.getDay() === 0 || d.getDay() === 6) {
            continue;
          }

          const dateStr = d.toISOString().split('T')[0];

          try {
            const response = await axios.get(
              `${this.baseUrl}/${ticker}/${dateStr}?adjusted=true&apikey=${this.apiKey}`,
              { timeout: 5000 }
            );

            if (response.data.status === 'OK') {
              data.push({
                date: dateStr,
                open: response.data.o,
                high: response.data.h,
                low: response.data.l,
                close: response.data.c,
                volume: response.data.v || 0,
              });
            }
          } catch (e) {
            // Skip failed days (market might be closed)
            continue;
          }

          // Rate limiting - Polygon has limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (data.length < 21) {
          throw new Error(`Insufficient data for ${ticker}: only ${data.length} days available`);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          console.warn(`[Polygon IO] Attempt ${attempt} failed for ${ticker}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }

    throw new Error(
      `Polygon IO fetch failed for ${ticker} after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  async getRussell2000Tickers(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.tickersUrl}?market=stocks&order=asc&limit=1000&apikey=${this.apiKey}`,
        { timeout: 10000 }
      );

      // Filter for Russell 2000 members (would need additional metadata)
      // For now, return active stocks and fallback to hardcoded list
      if (response.data.results && Array.isArray(response.data.results)) {
        const tickers = response.data.results
          .filter((r: any) => r.active === true)
          .map((r: any) => r.ticker)
          .slice(0, 2000);

        if (tickers.length > 0) {
          return tickers;
        }
      }

      // Fallback to hardcoded list
      return getRussell2000TickerList();
    } catch (error) {
      console.warn(`Failed to fetch Russell 2000 tickers from Polygon IO, using hardcoded list`);
      // Fallback to hardcoded list
      return getRussell2000TickerList();
    }
  }
}

/**
 * Create a data fetcher with fallback strategy
 */
export function createDataFetcher(
  polygonApiKey?: string
): IDataFetcher {
  // Prefer Polygon IO if API key provided
  if (polygonApiKey) {
    console.log('[Data Fetcher] Using Polygon IO (premium)');
    return new PolygonIOFetcher(polygonApiKey);
  }

  // Fall back to Yahoo Finance
  console.log('[Data Fetcher] Using Yahoo Finance (free)');
  return new YahooFinanceFetcher();
}
