import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { APIResponse, Signal } from '../types/index.js';

const router = Router();

/**
 * GET /api/signals
 * Fetch today's signals or signals from a specific date
 * Query params: date (YYYY-MM-DD), status, ticker, limit
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { date, status, ticker, limit = 100 } = req.query;

    let query = 'SELECT * FROM signals WHERE 1=1';
    const params: any[] = [];

    if (date) {
      query += ' AND entry_date = ?';
      params.push(date);
    } else {
      // Default to today if no date specified
      const today = new Date().toISOString().split('T')[0];
      query += ' AND entry_date = ?';
      params.push(today);
    }

    if (status) {
      query += ' AND signal_status = ?';
      params.push(status);
    }

    if (ticker) {
      query += ' AND ticker = ?';
      params.push(ticker);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const signals = await db.all(query, params);

    res.json({
      success: true,
      data: signals,
      timestamp: new Date().toISOString(),
    } as APIResponse<Signal[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<Signal[]>);
  }
});

/**
 * GET /api/signals/:id
 * Fetch a specific signal by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const signal = await db.get(
      'SELECT * FROM signals WHERE id = ?',
      [id]
    );

    if (!signal) {
      res.status(404).json({
        success: false,
        error: 'Signal not found',
        timestamp: new Date().toISOString(),
      } as APIResponse<Signal>);
      return;
    }

    res.json({
      success: true,
      data: signal,
      timestamp: new Date().toISOString(),
    } as APIResponse<Signal>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<Signal>);
  }
});

/**
 * POST /api/signals
 * Create a signal (used by scan engine)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      id,
      ticker,
      signal_type,
      entry_price,
      stop_loss_price,
      entry_date,
      scan_id,
      notes,
    } = req.body;

    if (
      !id ||
      !ticker ||
      !signal_type ||
      !entry_price ||
      !stop_loss_price ||
      !entry_date ||
      !scan_id
    ) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        timestamp: new Date().toISOString(),
      } as APIResponse<Signal>);
      return;
    }

    await db.run(
      `INSERT INTO signals 
       (id, ticker, signal_type, entry_price, stop_loss_price, entry_date, scan_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ticker,
        signal_type,
        entry_price,
        stop_loss_price,
        entry_date,
        scan_id,
        notes,
      ]
    );

    const signal = await db.get('SELECT * FROM signals WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: signal,
      timestamp: new Date().toISOString(),
    } as APIResponse<Signal>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<Signal>);
  }
});

export default router;
