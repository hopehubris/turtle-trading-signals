import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { APIResponse, Trade, TradeImportRecord } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/trades
 * Fetch trades with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { ticker, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM trades WHERE 1=1';
    const params: any[] = [];

    if (ticker) {
      query += ' AND ticker = ?';
      params.push(ticker);
    }

    query += ' ORDER BY entry_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const trades = await db.all(query, params);

    res.json({
      success: true,
      data: trades,
      timestamp: new Date().toISOString(),
    } as APIResponse<Trade[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<Trade[]>);
  }
});

/**
 * POST /api/trades
 * Create a manual trade entry
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      ticker,
      entry_date,
      entry_price,
      entry_shares,
      exit_date,
      exit_price,
      exit_shares,
      source_signal_id,
    } = req.body;

    if (
      !ticker ||
      !entry_date ||
      !entry_price ||
      !entry_shares
    ) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        timestamp: new Date().toISOString(),
      } as APIResponse<Trade>);
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO trades 
       (id, ticker, entry_date, entry_price, entry_shares, 
        exit_date, exit_price, exit_shares, trade_type, source_signal_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ticker,
        entry_date,
        entry_price,
        entry_shares,
        exit_date || null,
        exit_price || null,
        exit_shares || null,
        'manual',
        source_signal_id || null,
        now,
        now,
      ]
    );

    const trade = await db.get('SELECT * FROM trades WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: trade,
      timestamp: new Date().toISOString(),
    } as APIResponse<Trade>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<Trade>);
  }
});

/**
 * POST /api/trades/import
 * Import trades from CSV
 * Expected format: ticker, entry_date, entry_price, entry_shares, exit_date, exit_price, exit_shares
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { trades } = req.body as { trades: TradeImportRecord[] };

    if (!Array.isArray(trades) || trades.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No trades provided',
        timestamp: new Date().toISOString(),
      } as APIResponse<Trade[]>);
      return;
    }

    const importedTrades: Trade[] = [];
    const now = new Date().toISOString();

    for (const trade of trades) {
      const id = uuidv4();

      try {
        await db.run(
          `INSERT INTO trades 
           (id, ticker, entry_date, entry_price, entry_shares, 
            exit_date, exit_price, exit_shares, trade_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            trade.ticker,
            trade.entryDate,
            trade.entryPrice,
            trade.entryShares,
            trade.exitDate || null,
            trade.exitPrice || null,
            trade.exitShares || null,
            'csv_import',
            now,
            now,
          ]
        );

        const created = await db.get('SELECT * FROM trades WHERE id = ?', [id]);
        if (created) {
          importedTrades.push(created);
        }
      } catch (e) {
        console.error(`Failed to import trade for ${trade.ticker}:`, e);
        // Continue with next trade
      }
    }

    res.json({
      success: true,
      data: importedTrades,
      timestamp: new Date().toISOString(),
    } as APIResponse<Trade[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } as APIResponse<Trade[]>);
  }
});

export default router;
