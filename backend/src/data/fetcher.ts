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
  private maxRetries = 5; // Increased retries
  private retryDelayMs = 3000; // Increased delay to 3 seconds to avoid rate limiting

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
  private baseUrl = 'https://api.polygon.io/v2/aggs/ticker';
  private tickersUrl = 'https://api.polygon.io/v3/reference/tickers';
  private maxRetries = 3;
  private retryDelayMs = 1000;

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
        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - days * 24 * 60 * 60 * 1000
        );

        // Use Polygon's aggregate endpoint - much more efficient
        // Format: /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
        const fromDate = startDate.toISOString().split('T')[0].replace(/-/g, '');
        const toDate = endDate.toISOString().split('T')[0].replace(/-/g, '');
        
        const url = `${this.baseUrl}/${ticker}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=50000&apikey=${this.apiKey}`;
        
        console.log(`[Polygon IO] Fetching ${ticker} from ${fromDate} to ${toDate}`);
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (TurtleTrading/1.0)'
          }
        });

        if (response.data.status === 'OK' && response.data.results && Array.isArray(response.data.results)) {
          const data: OHLC[] = response.data.results.map((bar: any) => ({
            date: new Date(bar.t).toISOString().split('T')[0],
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v || 0,
          }));

          if (data.length < 21) {
            throw new Error(`Insufficient data for ${ticker}: only ${data.length} days available`);
          }

          console.log(`[Polygon IO] Successfully fetched ${data.length} bars for ${ticker}`);
          return data;
        } else {
          throw new Error(`Polygon IO returned status: ${response.data.status}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          console.warn(`[Polygon IO] Attempt ${attempt} failed for ${ticker}: ${lastError.message}. Retrying in ${this.retryDelayMs}ms...`);
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
/**
 * Mock fetcher for development/testing
 * Generates synthetic but realistic price data (300 days)
 */
export class MockFetcher implements IDataFetcher {
  async getHistoricalData(ticker: string, days: number): Promise<OHLC[]> {
    const data: OHLC[] = [];
    let price = 100 + Math.random() * 100; // Random starting price
    
    // Generate 300 days of data regardless of requested days
    // This ensures we have enough for the 200-day MA calculation
    const daysToGenerate = Math.max(300, days);
    const today = new Date();
    
    for (let i = daysToGenerate; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const change = (Math.random() - 0.5) * 4; // +/- 2% daily move
      price += change;
      
      const open = price;
      const high = price + Math.random() * 2;
      const low = price - Math.random() * 2;
      const close = price + (Math.random() - 0.5) * 1;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open,
        high: Math.max(open, close, high),
        low: Math.min(open, close, low),
        close,
        volume: 1000000 + Math.random() * 5000000,
      });
    }
    
    return data; // Return all generated data (250+ trading days)
  }
  
  async getRussell2000Tickers(): Promise<string[]> {
    return getRussell2000TickerList();
  }
}

export function createDataFetcher(
  polygonApiKey?: string
): IDataFetcher {
  // IMPORTANT: Data Source Selection
  // 
  // Current Status:
  //   ✅ Mock Fetcher: Working (generates realistic synthetic data)
  //   ❌ Polygon IO: API key plan doesn't include historical data access
  //        - Shows: "Your plan doesn't include this data timeframe"
  //        - Would need upgraded plan (Enterprise/Plus)
  //   ❌ Yahoo Finance: Rate-limited after few requests
  // 
  // Production Options:
  // 1. Keep Mock data for testing/backtesting (current, RECOMMENDED)
  // 2. Switch to Finnhub (free tier has real data): finnhub.io
  // 3. Use IEX Cloud (free tier limited but available): iexcloud.io
  // 4. Upgrade Polygon plan for historical data access
  //
  // To switch sources, modify the return statement below:
  
  // ACTIVE: Mock data (fully functional, unlimited requests)
  console.log('[Data Fetcher] Using Mock Fetcher (development/testing)');
  return new MockFetcher();
  
  // ALTERNATIVE: Polygon IO (requires upgraded plan)
  // if (polygonApiKey && polygonApiKey.length > 10) {
  //   return new PolygonIOFetcher(polygonApiKey);
  // }
  // return new YahooFinanceFetcher();
}
