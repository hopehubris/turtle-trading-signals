import axios, { AxiosInstance } from 'axios';
import { OHLC } from '../types/index.js';

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
 */
export class YahooFinanceFetcher implements IDataFetcher {
  private baseUrl = 'https://query1.finance.yahoo.com/v7/finance/download';

  async getHistoricalData(
    ticker: string,
    days: number
  ): Promise<OHLC[]> {
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
      });

      return this.parseYahooCSV(response.data);
    } catch (error) {
      throw new Error(
        `Failed to fetch data for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getRussell2000Tickers(): Promise<string[]> {
    // NOTE: Russell 2000 tickers would need to be fetched from a separate source
    // or pre-configured. This is a placeholder.
    // In production, use Polygon IO or a third-party service
    throw new Error(
      'getRussell2000Tickers not implemented for Yahoo Finance'
    );
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
      const volume = parseInt(parts[6], 10);

      // Skip if any values are invalid
      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getHistoricalData(
    ticker: string,
    days: number
  ): Promise<OHLC[]> {
    try {
      const data: OHLC[] = [];
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      // Fetch each day individually (Polygon API limitation)
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        try {
          const response = await axios.get(
            `${this.baseUrl}/${ticker}/${dateStr}?adjusted=true&apikey=${this.apiKey}`
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
          // Skip failed days
          continue;
        }
      }

      return data;
    } catch (error) {
      throw new Error(
        `Polygon IO fetch failed for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getRussell2000Tickers(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.tickersUrl}?market=stocks&order=asc&limit=1000&apikey=${this.apiKey}`
      );

      // Filter for Russell 2000 members (would need additional metadata)
      // For now, return all active stocks
      return response.data.results
        .filter((r: any) => r.active === true)
        .map((r: any) => r.ticker)
        .slice(0, 2000); // Return first 2000
    } catch (error) {
      throw new Error(
        `Failed to fetch Russell 2000 tickers: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    return new PolygonIOFetcher(polygonApiKey);
  }

  // Fall back to Yahoo Finance
  return new YahooFinanceFetcher();
}
