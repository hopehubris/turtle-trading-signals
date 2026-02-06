import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { APIResponse, PortfolioOverlay, SignalConflict } from '../types/index.js';

const router = Router();

/**
 * GET /api/portfolio/overlay
 * Get current positions overlaid with new signals to detect conflicts
 */
router.get('/overlay', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Get current portfolio positions
    const currentPositions = await db.all(
      'SELECT * FROM portfolio_positions ORDER BY ticker ASC'
    );

    // Get today's new signals
    const newSignals = await db.all(
      'SELECT * FROM signals WHERE entry_date = ? ORDER BY created_at DESC',
      [today]
    );

    // Detect conflicts
    const conflicts: SignalConflict[] = [];

    for (const position of currentPositions) {
      // Check if there's a conflicting signal for this ticker
      const conflictingSignal = newSignals.find(s => s.ticker === position.ticker);

      if (conflictingSignal) {
        // Determine conflict type
        // For now, just mark any signal on a held position as a conflict
        let conflictType: 'same_direction' | 'opposite_direction';

        // This is simplified - in production, you'd check the actual position direction
        // For now, assume long positions and check signal direction
        conflictType = conflictingSignal.signal_type === 'sell'
          ? 'opposite_direction'
          : 'same_direction';

        conflicts.push({
          ticker: position.ticker,
          currentPosition: position,
          newSignal: conflictingSignal,
          conflictType,
        });
      }
    }

    const overlay: PortfolioOverlay = {
      currentPositions,
      newSignals,
      conflicts,
    };

    res.json({
      success: true,
      data: overlay,
      timestamp: new Date().toISOString(),
    } as APIResponse<PortfolioOverlay>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<PortfolioOverlay>);
  }
});

/**
 * GET /api/portfolio/positions
 * Get all current portfolio positions
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const positions = await db.all(
      'SELECT * FROM portfolio_positions ORDER BY ticker ASC'
    );

    res.json({
      success: true,
      data: positions,
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
 * POST /api/portfolio/positions
 * Add a new portfolio position
 */
router.post('/positions', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      ticker,
      entry_date,
      entry_price,
      current_shares,
      cost_basis,
    } = req.body;

    if (!ticker || !entry_date || !entry_price || !current_shares || !cost_basis) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
      return;
    }

    // Check if position already exists
    const existing = await db.get(
      'SELECT id FROM portfolio_positions WHERE ticker = ?',
      [ticker]
    );

    if (existing) {
      res.status(400).json({
        success: false,
        error: `Position for ${ticker} already exists`,
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
      return;
    }

    const id = require('uuid').v4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO portfolio_positions 
       (id, ticker, entry_date, entry_price, current_shares, cost_basis, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ticker, entry_date, entry_price, current_shares, cost_basis, now, now]
    );

    const position = await db.get(
      'SELECT * FROM portfolio_positions WHERE id = ?',
      [id]
    );

    res.status(201).json({
      success: true,
      data: position,
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
 * DELETE /api/portfolio/positions/:ticker
 * Close a position
 */
router.delete('/positions/:ticker', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { ticker } = req.params;

    const position = await db.get(
      'SELECT * FROM portfolio_positions WHERE ticker = ?',
      [ticker]
    );

    if (!position) {
      res.status(404).json({
        success: false,
        error: `Position for ${ticker} not found`,
        timestamp: new Date().toISOString(),
      } as APIResponse<any>);
      return;
    }

    await db.run(
      'DELETE FROM portfolio_positions WHERE ticker = ?',
      [ticker]
    );

    res.json({
      success: true,
      data: { message: `Position for ${ticker} closed` },
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
