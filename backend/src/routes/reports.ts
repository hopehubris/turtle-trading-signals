import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { priceCache } from '../services/priceCache.js';
import {
  analyzeStockMetrics,
  getTopMovers,
  getNearLevels,
  getExtremeRSI,
  StockMetrics,
} from '../services/dataAnalytics.js';
import { APIResponse, OHLC } from '../types/index.js';

const router = Router();

/**
 * GET /api/reports
 * Redirect to /analysis or show cache status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const cacheCount = await db.get('SELECT COUNT(*) as count FROM price_cache');
    const tickerCount = await db.get('SELECT COUNT(DISTINCT ticker) as count FROM price_cache');
    
    if (cacheCount.count === 0) {
      return res.status(400).json({
        success: false,
        error: 'No cached price data. Run a scan first to populate the cache.',
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
    }
    
    return res.json({
      success: true,
      data: {
        status: 'ready',
        cachedBars: cacheCount.count,
        cachedTickers: tickerCount.count,
        analysisEndpoint: '/api/reports/analysis',
      },
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  }
});

/**
 * GET /api/reports/analysis
 * Get comprehensive market analysis
 */
router.get('/analysis', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    
    // Get all unique tickers from price_cache table
    const tickerRows = await db.all(
      'SELECT DISTINCT ticker FROM price_cache ORDER BY ticker'
    );
    
    if (!tickerRows || tickerRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No cached price data. Run a scan first to populate the cache.',
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
    }

    // Get all cached price data and analyze
    const allMetrics: StockMetrics[] = [];
    const tickers = tickerRows.map((r: any) => r.ticker);

    // Analyze each ticker
    for (const ticker of tickers) {
      try {
        // Try in-memory cache first
        let priceData = priceCache.get(ticker);
        
        // If not in memory, fetch from database
        if (!priceData) {
          const bars = await db.all(
            'SELECT date, open, high, low, close, volume FROM price_cache WHERE ticker = ? ORDER BY date',
            [ticker]
          );
          
          priceData = bars.map((bar: any) => ({
            date: bar.date,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume,
          })) as OHLC[];
        }
        
        if (priceData && priceData.length > 0) {
          const metrics = analyzeStockMetrics(ticker, priceData);
          allMetrics.push(metrics);
        }
      } catch (e) {
        console.warn(`Failed to analyze ${ticker}:`, e);
      }
    }

    if (allMetrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not analyze any stocks',
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
    }

    // Generate reports
    const reports = {
      topGainers: getTopMovers(allMetrics, 'gainers', 20),
      topLosers: getTopMovers(allMetrics, 'losers', 20),
      mostVolatile: getTopMovers(allMetrics, 'most-volatile', 20),
      nearATH: getNearLevels(allMetrics, 'near-ath', 5),
      nearATL: getNearLevels(allMetrics, 'near-atl', 5),
      nearEMA200: getNearLevels(allMetrics, 'near-ema200', 5),
      overbought: getExtremeRSI(allMetrics, 'overbought', 70),
      oversold: getExtremeRSI(allMetrics, 'oversold', 30),
      totalStocksAnalyzed: allMetrics.length,
      timestamp: new Date().toISOString(),
    };

    return res.json({
      success: true,
      data: reports,
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  }
});

/**
 * GET /api/reports/ticker/:ticker
 * Get detailed metrics for a single ticker
 */
router.get('/ticker/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const priceData = priceCache.get(ticker.toUpperCase());

    if (!priceData) {
      return res.status(404).json({
        success: false,
        error: `No cached data for ${ticker}. Run a scan first.`,
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
    }

    const metrics = analyzeStockMetrics(ticker.toUpperCase(), priceData);

    return res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  }
});

/**
 * GET /api/reports/search
 * Search and filter stocks by various criteria
 * Query params: minRSI, maxRSI, minChange, maxChange, minVolatility, maxVolatility, etc.
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      minRSI,
      maxRSI,
      minChange,
      maxChange,
      minVolatility,
      maxVolatility,
      priceFromEMA200Min,
      priceFromEMA200Max,
      limit = '50',
    } = req.query;

    const cacheStats = (global as any).priceCache?.getStats();
    if (!cacheStats || cacheStats.cachedTickers === 0) {
      return res.status(400).json({
        success: false,
        error: 'No cached price data.',
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
    }

    const allMetrics: StockMetrics[] = [];
    for (const { ticker } of cacheStats.details || []) {
      try {
        const priceData = priceCache.get(ticker);
        if (priceData) {
          allMetrics.push(analyzeStockMetrics(ticker, priceData));
        }
      } catch (e) {
        // Skip erroring tickers
      }
    }

    // Apply filters
    let filtered = allMetrics;

    if (minRSI) {
      filtered = filtered.filter(m => m.rsi14 >= parseFloat(minRSI as string));
    }
    if (maxRSI) {
      filtered = filtered.filter(m => m.rsi14 <= parseFloat(maxRSI as string));
    }
    if (minChange) {
      filtered = filtered.filter(m => m.changePercent >= parseFloat(minChange as string));
    }
    if (maxChange) {
      filtered = filtered.filter(m => m.changePercent <= parseFloat(maxChange as string));
    }
    if (minVolatility) {
      filtered = filtered.filter(m => m.volatility >= parseFloat(minVolatility as string));
    }
    if (maxVolatility) {
      filtered = filtered.filter(m => m.volatility <= parseFloat(maxVolatility as string));
    }
    if (priceFromEMA200Min) {
      filtered = filtered.filter(m => m.priceVsEma200 >= parseFloat(priceFromEMA200Min as string));
    }
    if (priceFromEMA200Max) {
      filtered = filtered.filter(m => m.priceVsEma200 <= parseFloat(priceFromEMA200Max as string));
    }

    const limitNum = parseInt(limit as string);
    const results = filtered.slice(0, limitNum);

    return res.json({
      success: true,
      data: {
        filters: {
          minRSI: minRSI ? parseFloat(minRSI as string) : null,
          maxRSI: maxRSI ? parseFloat(maxRSI as string) : null,
          minChange: minChange ? parseFloat(minChange as string) : null,
          maxChange: maxChange ? parseFloat(maxChange as string) : null,
          minVolatility: minVolatility ? parseFloat(minVolatility as string) : null,
          maxVolatility: maxVolatility ? parseFloat(maxVolatility as string) : null,
          priceFromEMA200Min: priceFromEMA200Min ? parseFloat(priceFromEMA200Min as string) : null,
          priceFromEMA200Max: priceFromEMA200Max ? parseFloat(priceFromEMA200Max as string) : null,
        },
        results,
        totalMatching: filtered.length,
        returned: results.length,
      },
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  }
});

export default router;
