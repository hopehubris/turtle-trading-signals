import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { APIResponse, ScanResult } from '../types/index.js';
import { performDailyScan } from '../jobs/scan.js';
import { ScanConfig } from '../engine/types.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/admin/health
 * Check system health and scan status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Get last scan
    const lastScan = await db.get(
      'SELECT * FROM scan_history ORDER BY created_at DESC LIMIT 1'
    );

    // Get next scheduled scan (4 PM ET today or tomorrow)
    const nextScan = calculateNextScanTime();

    const health = {
      status: 'healthy',
      databaseConnected: true,
      lastScan: lastScan || null,
      nextScan,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  }
});

/**
 * POST /api/admin/scan
 * Trigger a manual scan with optional config
 * Body parameters:
 *   - tickers_override?: string[] - specific tickers to scan
 *   - system?: 'system1' | 'system2' - which system to use (default: system1)
 *   - useTrendFilter?: boolean - enable 200-day MA trend filter (default: true)
 *   - stopLossMultiplier?: number - multiplier for stop loss calculation (default: 2.0 for system1, 1.5 for system2)
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const {
      tickers_override,
      system = 'system1',
      useTrendFilter = true,
      stopLossMultiplier = system === 'system1' ? 2.0 : 1.5,
    } = req.body;

    // Validate system parameter
    if (system !== 'system1' && system !== 'system2') {
      return res.status(400).json({
        success: false,
        error: 'Invalid system parameter. Must be "system1" or "system2".',
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
    }

    // Create scan config
    const scanConfig: ScanConfig = {
      system,
      useTrendFilter,
      riskPerTrade: 2,
      stopLossMultiplier,
    };

    // Trigger scan asynchronously (don't wait for completion)
    performDailyScan('manual', tickers_override, scanConfig)
      .catch(error => {
        console.error('Background scan failed:', error);
      });

    const scanId = generateScanId();

    return res.json({
      success: true,
      data: {
        scanId,
        status: 'initiated',
        message: 'Scan started in background with specified config. Check /api/admin/health for progress.',
        config: scanConfig,
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
 * GET /api/admin/settings
 * Get system settings
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = {
      scanTime: '16:00', // 4 PM ET
      scanTimeZone: 'America/New_York',
      russelThreshold: 2000, // Top 2000 by market cap
      minVolumeFilter: 100000, // Min daily volume
      liquidityFilter: true,
      timeoutMinutes: 5,
      maxRetries: 3,
    };

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  }
});

/**
 * GET /api/admin/scan-history
 * Get recent scan history
 */
router.get('/scan-history', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { limit = 20 } = req.query;

    const scans = await db.all(
      'SELECT * FROM scan_history ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    res.json({
      success: true,
      data: scans,
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<any>);
  }
});

/**
 * Helper: Calculate next scan time (4 PM ET)
 */
function calculateNextScanTime(): string {
  const now = new Date();
  // Convert to ET
  const etTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );

  let nextScan = new Date(etTime);
  nextScan.setHours(16, 0, 0, 0); // 4 PM

  // If 4 PM has passed today, schedule for tomorrow
  if (nextScan <= etTime) {
    nextScan.setDate(nextScan.getDate() + 1);
  }

  return nextScan.toISOString();
}

/**
 * POST /api/admin/tickers/upload
 * Upload a CSV file with tickers (one per line)
 */
router.post('/tickers/upload', async (req: Request, res: Response) => {
  try {
    const { tickers } = req.body;

    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: tickers must be an array',
      } as APIResponse<any>);
    }

    // Validate tickers (uppercase, no spaces)
    const validTickers = tickers
      .map((t: string) => t.trim().toUpperCase())
      .filter((t: string) => /^[A-Z]{1,5}$/.test(t)); // 1-5 letter tickers

    if (validTickers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid tickers provided',
      } as APIResponse<any>);
    }

    // Save to a file or database
    const db = getDatabase();
    
    // Create/update custom tickers table if needed
    await db.run(`
      CREATE TABLE IF NOT EXISTS custom_tickers (
        id TEXT PRIMARY KEY,
        ticker TEXT UNIQUE NOT NULL,
        added_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clear existing custom tickers and insert new ones
    await db.run('DELETE FROM custom_tickers');
    
    for (const ticker of validTickers) {
      await db.run(
        'INSERT INTO custom_tickers (id, ticker) VALUES (?, ?)',
        [uuidv4(), ticker]
      );
    }

    return res.json({
      success: true,
      data: {
        message: `Uploaded ${validTickers.length} tickers`,
        tickersAdded: validTickers.length,
        tickers: validTickers,
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
 * GET /api/admin/tickers
 * Get current tickers list (default or custom)
 */
router.get('/tickers', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    
    // Check if custom tickers exist
    const customTickers = await db.all(
      'SELECT ticker FROM custom_tickers ORDER BY ticker'
    );

    if (customTickers && customTickers.length > 0) {
      const tickers = customTickers.map((row: any) => row.ticker);
      return res.json({
        success: true,
        data: {
          source: 'custom',
          count: tickers.length,
          tickers: tickers.slice(0, 100), // Return first 100 for display
        },
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
    }

    // Fall back to default Russell 2000
    return res.json({
      success: true,
      data: {
        source: 'default',
        count: 400, // Approximate
        tickers: [],
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
 * Helper: Generate scan ID
 */
function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default router;
