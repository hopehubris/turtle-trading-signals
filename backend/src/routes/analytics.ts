import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { APIResponse, AnalyticsMetrics } from '../types/index.js';

const router = Router();

/**
 * GET /api/analytics/performance
 * Calculate trading performance metrics from closed trades
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Get all trades with P&L data
    const trades = await db.all(`
      SELECT 
        id,
        ticker,
        entry_date,
        entry_price,
        entry_shares,
        exit_date,
        exit_price,
        exit_shares,
        CASE 
          WHEN exit_price IS NOT NULL THEN (exit_price - entry_price) * exit_shares
          ELSE 0 
        END as pnl,
        CASE 
          WHEN exit_price IS NOT NULL THEN ((exit_price - entry_price) / entry_price) * 100
          ELSE 0 
        END as pnl_percent
      FROM trades
      ORDER BY entry_date DESC
    `);

    // Calculate metrics
    const closedTrades = trades.filter(t => t.exit_price !== null && t.exit_price !== undefined);
    const openTrades = trades.filter(t => t.exit_price === null || t.exit_price === undefined);

    const totalTrades = trades.length;
    const winningTrades = closedTrades.filter(t => t.pnl > 0).length;
    const losingTrades = closedTrades.filter(t => t.pnl < 0).length;
    const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const averagePnL = closedTrades.length > 0 ? totalPnL / closedTrades.length : 0;
    const averagePnLPercent = closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + t.pnl_percent, 0) / closedTrades.length
      : 0;

    const winRate = totalTrades > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    const bestTrade = closedTrades.length > 0
      ? Math.max(...closedTrades.map(t => t.pnl))
      : 0;
    const worstTrade = closedTrades.length > 0
      ? Math.min(...closedTrades.map(t => t.pnl))
      : 0;

    const grossProfit = closedTrades
      .filter(t => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(
      closedTrades
        .filter(t => t.pnl < 0)
        .reduce((sum, t) => sum + t.pnl, 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const largestWin = closedTrades
      .filter(t => t.pnl > 0)
      .reduce((max, t) => Math.max(max, t.pnl), 0);
    const largestLoss = Math.abs(
      closedTrades
        .filter(t => t.pnl < 0)
        .reduce((min, t) => Math.min(min, t.pnl), 0)
    );

    const metrics: AnalyticsMetrics = {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      averagePnL,
      averagePnLPercent,
      bestTrade,
      worstTrade,
      profitFactor,
      largestWin,
      largestLoss,
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    } as APIResponse<AnalyticsMetrics>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<AnalyticsMetrics>);
  }
});

/**
 * GET /api/analytics/signals
 * Get signal statistics and performance
 */
router.get('/signals', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Get all signals
    const allSignals = await db.all(
      'SELECT * FROM signals ORDER BY created_at DESC'
    );

    const buySignals = allSignals.filter(s => s.signal_type === 'buy').length;
    const sellSignals = allSignals.filter(s => s.signal_type === 'sell').length;

    // Get today's signals
    const today = new Date().toISOString().split('T')[0];
    const todaySignals = allSignals.filter(s => s.entry_date === today);

    const data = {
      totalSignals: allSignals.length,
      buySignals,
      sellSignals,
      todaySignals: todaySignals.length,
      byStatus: {
        pending: allSignals.filter(s => s.signal_status === 'pending').length,
        active: allSignals.filter(s => s.signal_status === 'active').length,
        triggered: allSignals.filter(s => s.signal_status === 'triggered').length,
        expired: allSignals.filter(s => s.signal_status === 'expired').length,
      },
      recentSignals: todaySignals,
    };

    res.json({
      success: true,
      data,
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

export default router;
