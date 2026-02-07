import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { ScanTrigger, ScanStatus } from '../types/index.js';
import { createDataFetcher } from '../data/fetcher.js';
import { generateSignalV2 } from '../engine/signals.js';
import { getRussell2000Tickers } from '../data/russell2000.js';
import { ScanConfig } from '../engine/types.js';

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

    // Create data fetcher
    const fetcher = createDataFetcher(process.env.POLYGON_API_KEY);

    // Scan each ticker
    for (const ticker of tickers) {
      try {
        // Add delay between requests to avoid rate limiting (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch historical data (21+ days)
        const priceData = await fetcher.getHistoricalData(ticker, 30);

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
    console.log(
      `[Scan ${scanHistoryId}] Completed in ${executionTime}ms - Generated ${signalsGenerated} signals (${buySignals} buy, ${sellSignals} sell) | Filtered: ${filteredSignals} | System: ${scanConfig.system} | Trend Filter: ${scanConfig.useTrendFilter}`
    );
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
