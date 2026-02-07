import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { ScanTrigger, ScanStatus } from '../types/index.js';
import { createDataFetcher, YahooFinanceFetcher } from '../data/fetcher.js';
import { generateSignalV2 } from '../engine/signals.js';
import { getRussell2000Tickers } from '../data/russell2000.js';
import { ScanConfig } from '../engine/types.js';
import { priceCache } from '../services/priceCache.js';

/**
 * Perform a daily Turtle Trading scan
 *
 * Steps:
 * 1. Fetch Russell 2000 tickers
 * 2. Get historical data for each ticker
 * 3. Calculate Turtle signals for each ticker using specified system and config
 * 4. Store signals in database
 * 5. Update scan history
 */
export async function performDailyScan(
  trigger: ScanTrigger,
  tickersOverride?: string[],
  config?: ScanConfig
): Promise<void> {
  const db = getDatabase();
  const scanHistoryId = uuidv4();
  const startTime = Date.now();
  const now = new Date().toISOString();

  // Default config if not provided
  const scanConfig: ScanConfig = config || {
    system: 'system1',
    useTrendFilter: true,
    riskPerTrade: 2,
    stopLossMultiplier: 2.0,
  };

  let tickers: string[] = [];
  let tickersScanned = 0;
  let signalsGenerated = 0;
  let buySignals = 0;
  let sellSignals = 0;
  let filteredSignals = 0;
  let scanStatus: ScanStatus = 'in_progress';
  let errorMessage: string | undefined;
  let apiCallsSaved = 0;
  
  // Start cache session for this scan
  const cacheSessionId = priceCache.startSession();

  try {
    // Create scan history record
    await db.run(
      `INSERT INTO scan_history 
       (id, scan_timestamp, scan_trigger, scan_status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [scanHistoryId, now, trigger, 'in_progress', now]
    );

    console.log(`[Scan ${scanHistoryId}] Starting scan with trigger: ${trigger}`);
    console.log(`[Scan ${scanHistoryId}] Config: system=${scanConfig.system}, trendFilter=${scanConfig.useTrendFilter}, stopLossMultiplier=${scanConfig.stopLossMultiplier}`);
    console.log(`[Scan ${scanHistoryId}] Cache session: ${cacheSessionId}`);

    // Get tickers to scan
    if (tickersOverride && tickersOverride.length > 0) {
      tickers = tickersOverride;
    } else {
      // Try custom tickers first
      try {
        const customTickers = await db.all('SELECT ticker FROM custom_tickers ORDER BY ticker');
        if (customTickers && customTickers.length > 0) {
          tickers = customTickers.map((row: any) => row.ticker);
          console.log(`[Scan ${scanHistoryId}] Using ${tickers.length} custom tickers`);
        }
      } catch (e) {
        console.warn('Custom tickers table not found, using default Russell 2000');
      }

      // Fall back to Russell 2000 if no custom tickers
      if (tickers.length === 0) {
        try {
          tickers = await getRussell2000Tickers();
        } catch (e) {
          console.warn('Failed to get Russell 2000 tickers, using fallback list');
          tickers = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
            'META', 'NVDA', 'JPM', 'V', 'WMT',
            'JNJ', 'PG', 'MA', 'UNH', 'HDFC',
          ];
        }
      }
    }

    console.log(`[Scan ${scanHistoryId}] Processing ${tickers.length} tickers`);

    // Create data fetcher with fallback support
    let fetcher = createDataFetcher(process.env.POLYGON_API_KEY);
    let fallbackFetcher: any = null;
    let useFallback = false;

    // Scan each ticker
    for (const ticker of tickers) {
      try {
        // Check cache first
        let priceData = priceCache.get(ticker);
        
        if (priceData) {
          // Cache hit - skip API call
          apiCallsSaved++;
          console.log(`[Scan] Cache hit for ${ticker} (${priceData.length} bars)`);
        } else {
          // Cache miss - fetch from API
          // Add delay between requests to avoid rate limiting (500ms)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fetch historical data (21+ days) - with fallback support
          try {
            priceData = await fetcher.getHistoricalData(ticker, 30);
          } catch (primaryError) {
            // If primary fetcher fails, try fallback (Yahoo Finance)
            if (!useFallback) {
              console.warn(`[Scan] Primary fetcher failed, switching to Yahoo Finance fallback`);
              useFallback = true;
              fallbackFetcher = new YahooFinanceFetcher();
            }
            
            try {
              priceData = await fallbackFetcher.getHistoricalData(ticker, 30);
              console.log(`[Scan] Yahoo Finance fallback succeeded for ${ticker}`);
            } catch (fallbackError) {
              // Both failed, log and skip this ticker
              console.warn(`[Scan] Both fetchers failed for ${ticker}: ${primaryError instanceof Error ? primaryError.message : 'unknown error'}`);
              tickersScanned++;
              continue;
            }
          }
          
          // Store in cache for subsequent scans and persist to database
          if (priceData && priceData.length >= 21) {
            priceCache.set(ticker, priceData);
            
            // Persist to database for Reports page
            try {
              for (const bar of priceData) {
                await db.run(
                  `INSERT OR REPLACE INTO price_cache (ticker, date, open, high, low, close, volume, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [ticker, bar.date, bar.open, bar.high, bar.low, bar.close, bar.volume, new Date().toISOString()]
                );
              }
            } catch (e) {
              console.warn(`[Scan] Failed to persist price cache for ${ticker}:`, e instanceof Error ? e.message : 'unknown error');
            }
          }
        }

        // Validate data quality
        if (!priceData || priceData.length < 21) {
          console.warn(`[Scan] Insufficient data for ${ticker}: ${priceData?.length || 0} bars`);
          tickersScanned++;
          continue;
        }

        // Calculate signal using new engine
        try {
          const signalCalc = generateSignalV2(ticker, priceData, scanConfig);

          // Get the signal result from the selected system
          const systemSignal = scanConfig.system === 'system1' ? signalCalc.system1 : signalCalc.system2;
          
          // Check if signal was generated (not filtered by trend)
          if (systemSignal.buySignal || systemSignal.sellSignal) {
            const signalType = systemSignal.buySignal ? 'buy' : 'sell';
            const signalId = uuidv4();
            const systemUsed = scanConfig.system === 'system1' ? 'System 1 (20-day)' : 'System 2 (55-day)';
            const trendFilterInfo = scanConfig.useTrendFilter ? ` [Trend Filter: ${signalCalc.trendAnalysis.context}]` : '';

            await db.run(
              `INSERT INTO signals 
               (id, ticker, signal_type, entry_price, stop_loss_price, entry_date, scan_id, signal_status, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                signalId,
                ticker,
                signalType,
                systemSignal.entryPrice,
                systemSignal.stopLoss,
                signalCalc.date,
                scanHistoryId,
                'active',
                `${systemUsed}: ${systemSignal.reason}${trendFilterInfo}`,
              ]
            );

            signalsGenerated++;
            if (signalType === 'buy') {
              buySignals++;
            } else {
              sellSignals++;
            }

            console.log(`[Scan] Signal generated for ${ticker}: ${signalType} at $${systemSignal.entryPrice?.toFixed(2)} using ${scanConfig.system}`);
          } else if (systemSignal.trendFiltered) {
            // Track filtered signals for analysis
            filteredSignals++;
            console.log(`[Scan] Signal filtered for ${ticker} (trend filter): ${systemSignal.reason}`);
          }
        } catch (signalError) {
          console.warn(
            `[Scan] Signal calculation failed for ${ticker}:`,
            signalError instanceof Error ? signalError.message : 'unknown error'
          );
        }

        tickersScanned++;
      } catch (tickerError) {
        console.warn(
          `[Scan] Failed to fetch data for ${ticker}:`,
          tickerError instanceof Error ? tickerError.message : 'unknown error'
        );
        tickersScanned++;
      }

      // Rate limiting - be nice to data providers
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update scan as completed
    const executionTime = Date.now() - startTime;
    await db.run(
      `UPDATE scan_history 
       SET scan_status = ?, execution_time_ms = ?, 
           tickers_scanned = ?, signals_generated = ?, buy_signals = ?, sell_signals = ?
       WHERE id = ?`,
      ['completed', executionTime, tickersScanned, signalsGenerated, buySignals, sellSignals, scanHistoryId]
    );

    scanStatus = 'completed';
    const cacheStats = priceCache.getStats();
    console.log(
      `[Scan ${scanHistoryId}] Completed in ${executionTime}ms - Generated ${signalsGenerated} signals (${buySignals} buy, ${sellSignals} sell) | Filtered: ${filteredSignals} | System: ${scanConfig.system} | Trend Filter: ${scanConfig.useTrendFilter} | API Calls Saved: ${apiCallsSaved}`
    );
    console.log(`[Scan ${scanHistoryId}] Cache Session Stats:`, cacheStats);
    
    // Keep cache session active for quick re-scans with different configs
    // (Don't call priceCache.endSession() here - let it persist for related scans)
  } catch (error) {
    scanStatus = 'failed';
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Scan ${scanHistoryId}] Failed:`, errorMessage);

    const executionTime = Date.now() - startTime;
    await db.run(
      `UPDATE scan_history 
       SET scan_status = ?, error_message = ?, execution_time_ms = ?
       WHERE id = ?`,
      ['failed', errorMessage, executionTime, scanHistoryId]
    );

    throw error;
  }
}

/**
 * Get scan results for a specific scan ID
 */
export async function getScanResults(scanId: string): Promise<any> {
  const db = getDatabase();

  const scanHistory = await db.get('SELECT * FROM scan_history WHERE id = ?', [scanId]);

  if (!scanHistory) {
    throw new Error(`Scan ${scanId} not found`);
  }

  const signals = await db.all('SELECT * FROM signals WHERE scan_id = ?', [scanId]);

  return {
    scan: scanHistory,
    signals,
  };
}
