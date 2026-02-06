import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { ScanTrigger, ScanStatus } from '../types/index.js';
import { createDataFetcher } from '../data/fetcher.js';
import { generateSignal } from '../engine/signals.js';
import { getRussell2000Tickers } from '../data/russell2000.js';

/**
 * Perform a daily Turtle Trading scan
 *
 * Steps:
 * 1. Fetch Russell 2000 tickers
 * 2. Get historical data for each ticker
 * 3. Calculate Turtle signals for each ticker
 * 4. Store signals in database
 * 5. Update scan history
 */
export async function performDailyScan(
  trigger: ScanTrigger,
  tickersOverride?: string[]
): Promise<void> {
  const db = getDatabase();
  const scanHistoryId = uuidv4();
  const startTime = Date.now();
  const now = new Date().toISOString();

  let tickers: string[] = [];
  let tickersScanned = 0;
  let signalsGenerated = 0;
  let buySignals = 0;
  let sellSignals = 0;
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

    // Get tickers to scan
    if (tickersOverride && tickersOverride.length > 0) {
      tickers = tickersOverride;
    } else {
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

    console.log(`[Scan ${scanHistoryId}] Processing ${tickers.length} tickers`);

    // Create data fetcher
    const fetcher = createDataFetcher(process.env.POLYGON_API_KEY);

    // Scan each ticker
    for (const ticker of tickers) {
      try {
        // Fetch historical data (21+ days)
        const priceData = await fetcher.getHistoricalData(ticker, 30);

        // Validate data quality
        if (!priceData || priceData.length < 21) {
          console.warn(`[Scan] Insufficient data for ${ticker}: ${priceData?.length || 0} bars`);
          tickersScanned++;
          continue;
        }

        // Calculate signal
        try {
          const signal = generateSignal(ticker, priceData);

          // Store in database if signal is triggered
          if (signal.buySignal || signal.sellSignal) {
            const signalType = signal.buySignal ? 'buy' : 'sell';
            const signalId = uuidv4();

            await db.run(
              `INSERT INTO signals 
               (id, ticker, signal_type, entry_price, stop_loss_price, entry_date, scan_id, signal_status, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                signalId,
                ticker,
                signalType,
                signal.entryPrice,
                signal.stopLoss,
                signal.date,
                scanHistoryId,
                'active',
                signal.reason || '',
              ]
            );

            signalsGenerated++;
            if (signalType === 'buy') {
              buySignals++;
            } else {
              sellSignals++;
            }

            console.log(`[Scan] Signal generated for ${ticker}: ${signalType} at $${signal.entryPrice}`);
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
      `[Scan ${scanHistoryId}] Completed in ${executionTime}ms - Generated ${signalsGenerated} signals (${buySignals} buy, ${sellSignals} sell)`
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
