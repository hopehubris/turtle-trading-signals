import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { APIResponse, ScanResult } from '../types/index.js';
import { performDailyScan } from '../jobs/scan.js';
import { ScanConfig } from '../engine/types.js';
import { priceCache } from '../services/priceCache.js';
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
 * GET /api/admin/scan-progress
 * Get current scan progress (for UI updates)
 */
router.get('/scan-progress', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Get the most recent scan
    const lastScan = await db.get(
      'SELECT * FROM scan_history ORDER BY created_at DESC LIMIT 1'
    );

    if (!lastScan) {
      return res.json({
        success: true,
        data: {
          status: 'idle',
          progress: 0,
          message: 'No scan in progress',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // If scan is not in progress, return completed status
    if (lastScan.scan_status !== 'in_progress') {
      const scannedCount = lastScan.tickers_scanned || 0;
      const signalsCount = lastScan.signals_generated || 0;
      let completionMessage = '';
      
      if (lastScan.scan_status === 'completed') {
        completionMessage = `Scan completed: ${scannedCount} tickers processed, ${signalsCount} signals generated`;
      } else if (lastScan.scan_status === 'failed') {
        completionMessage = `Scan failed: ${lastScan.error_message || 'Unknown error'}`;
      } else {
        completionMessage = `Scan ${lastScan.scan_status}`;
      }
      
      return res.json({
        success: true,
        data: {
          status: lastScan.scan_status,
          progress: lastScan.scan_status === 'completed' ? 100 : 0,
          tickersScanned: lastScan.tickers_scanned,
          totalTickers: scannedCount || 400, // Use scanned count or estimate
          signalsGenerated: lastScan.signals_generated,
          executionTime: lastScan.execution_time_ms,
          message: completionMessage,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Scan is in progress - calculate progress
    const elapsedSeconds = (Date.now() - new Date(lastScan.created_at).getTime()) / 1000;
    const avgTimePerTicker = 0.6; // ~600ms per ticker (API call + processing)
    const estimatedTotalTime = 400 * avgTimePerTicker; // ~240 seconds for 400 tickers
    const estimatedRemaining = Math.max(0, estimatedTotalTime - elapsedSeconds);
    const progress = Math.min(100, Math.round((elapsedSeconds / estimatedTotalTime) * 100));

    // Calculate estimated tickers scanned based on progress
    const estimatedTickersScanned = Math.round((progress / 100) * 400);
    const remainingMessage = estimatedRemaining > 0 
      ? `~${Math.round(estimatedRemaining)} seconds remaining`
      : 'completing...';
    
    return res.json({
      success: true,
      data: {
        status: 'in_progress',
        progress,
        tickersScanned: lastScan.tickers_scanned,
        totalTickers: 400, // Estimated
        signalsGenerated: lastScan.signals_generated,
        elapsedSeconds: Math.round(elapsedSeconds),
        estimatedRemainingSeconds: Math.round(estimatedRemaining),
        estimatedTotalSeconds: Math.round(estimatedTotalTime),
        estimatedTickersScanned,
        message: `Estimated ~${estimatedTickersScanned} / 400 tickers processed, ${remainingMessage}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
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
 * POST /api/admin/tickers/reset
 * Reset to default Russell 2000 list
 */
router.post('/tickers/reset', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Delete all custom tickers
    await db.run('DELETE FROM custom_tickers');

    return res.json({
      success: true,
      data: {
        message: 'Ticker list reset to default Russell 2000',
        source: 'default',
        count: 400,
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
 * GET /api/admin/cache/stats
 * Get price cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = priceCache.getStats();
    
    return res.json({
      success: true,
      data: {
        ...stats,
        message: `Cache contains ${stats.cachedTickers} tickers`,
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
 * POST /api/admin/cache/clear
 * Clear the price cache (useful between scan sessions)
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    priceCache.clear();
    
    return res.json({
      success: true,
      data: {
        message: 'Price cache cleared',
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
