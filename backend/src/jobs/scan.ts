import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { ScanTrigger, ScanStatus } from '../types/index.js';

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
  const scanId = uuidv4();
  const startTime = Date.now();
  const now = new Date().toISOString();

  // Create scan history record
  const scanHistoryId = uuidv4();
  let scanStatus: ScanStatus = 'in_progress';
  let errorMessage: string | undefined;

  try {
    // Initialize scan record
    await db.run(
      `INSERT INTO scan_history 
       (id, scan_timestamp, scan_trigger, scan_status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [scanHistoryId, now, trigger, 'in_progress', now]
    );

    // TODO: Implement the actual scan logic
    // 1. Get tickers
    // 2. Fetch data
    // 3. Calculate signals
    // 4. Store signals

    // For now, this is a placeholder
    console.log(`[Scan ${scanId}] Initiated with trigger: ${trigger}`);

    // Update scan as completed
    const executionTime = Date.now() - startTime;
    await db.run(
      `UPDATE scan_history 
       SET scan_status = ?, execution_time_ms = ?, 
           tickers_scanned = 0, signals_generated = 0, buy_signals = 0, sell_signals = 0
       WHERE id = ?`,
      ['completed', executionTime, scanHistoryId]
    );

    scanStatus = 'completed';
  } catch (error) {
    scanStatus = 'failed';
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Scan ${scanId}] Failed:`, errorMessage);

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

  const scanHistory = await db.get(
    'SELECT * FROM scan_history WHERE id = ?',
    [scanId]
  );

  if (!scanHistory) {
    throw new Error(`Scan ${scanId} not found`);
  }

  const signals = await db.all(
    'SELECT * FROM signals WHERE scan_id = ?',
    [scanId]
  );

  return {
    scan: scanHistory,
    signals,
  };
}
