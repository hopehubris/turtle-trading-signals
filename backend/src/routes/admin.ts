import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { APIResponse, ScanResult } from '../types/index.js';
import { performDailyScan } from '../jobs/scan.js';
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
 * Trigger a manual scan
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { tickers_override } = req.body;

    // Trigger scan asynchronously (don't wait for completion)
    performDailyScan('manual', tickers_override)
      .catch(error => {
        console.error('Background scan failed:', error);
      });

    const scanId = generateScanId();

    res.json({
      success: true,
      data: {
        scanId,
        status: 'initiated',
        message: 'Scan started in background. Check /api/admin/health for progress.',
      },
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
 * Helper: Generate scan ID
 */
function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default router;
