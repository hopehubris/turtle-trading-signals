import { initializeDatabase, getDatabase, closeDatabase } from './database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed database with test data
 * Useful for development and testing before real data fetcher is ready
 */
export async function seedTestData(): Promise<void> {
  const dbPath = process.env.DB_PATH || 'data/signals.db';

  try {
    console.log('🌱 Seeding test data...');

    // Initialize database
    await initializeDatabase(dbPath);
    const db = getDatabase();

    // Generate sample price data for 5 tickers
    const sampleTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const today = new Date();

    console.log('\n💰 Inserting sample price data...');
    for (const ticker of sampleTickers) {
      // Generate 25 days of sample OHLC data
      for (let i = 24; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Generate realistic OHLC data
        const basePrice = 100 + Math.random() * 200;
        const open = basePrice + (Math.random() - 0.5) * 5;
        const close = open + (Math.random() - 0.5) * 10;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;
        const volume = Math.floor(Math.random() * 5000000) + 1000000;

        await db.run(
          `INSERT OR IGNORE INTO price_cache 
           (ticker, date, open, high, low, close, volume)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [ticker, dateStr, open, high, low, close, volume]
        );
      }
      console.log(`  ✅ ${ticker}`);
    }

    // Create a sample scan history record
    console.log('\n📊 Inserting sample scan history...');
    const scanId = uuidv4();
    const now = new Date().toISOString();
    const today_str = new Date().toISOString().split('T')[0];

    await db.run(
      `INSERT INTO scan_history 
       (id, scan_timestamp, scan_trigger, tickers_scanned, signals_generated, 
        buy_signals, sell_signals, scan_status, execution_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scanId, today_str, 'scheduled', 100, 5, 2, 3, 'completed', 45000, now]
    );
    console.log(`  ✅ Scan ${scanId}`);

    // Create sample signals
    console.log('\n🎯 Inserting sample signals...');
    const buySignalId = uuidv4();
    const sellSignalId = uuidv4();

    await db.run(
      `INSERT OR IGNORE INTO signals 
       (id, ticker, signal_type, entry_price, stop_loss_price, 
        entry_date, scan_id, signal_status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        buySignalId,
        'AAPL',
        'buy',
        150.25,
        145.50,
        today_str,
        scanId,
        'pending',
        'Sample buy signal - Close broke above 20-day high',
        now,
      ]
    );
    console.log(`  ✅ Buy signal for AAPL`);

    await db.run(
      `INSERT OR IGNORE INTO signals 
       (id, ticker, signal_type, entry_price, stop_loss_price, 
        entry_date, scan_id, signal_status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sellSignalId,
        'MSFT',
        'sell',
        320.75,
        328.50,
        today_str,
        scanId,
        'pending',
        'Sample sell signal - Close broke below 10-day low',
        now,
      ]
    );
    console.log(`  ✅ Sell signal for MSFT`);

    // Create sample trades
    console.log('\n📈 Inserting sample trades...');
    const tradeId1 = uuidv4();
    const tradeId2 = uuidv4();

    await db.run(
      `INSERT OR IGNORE INTO trades 
       (id, ticker, entry_date, entry_price, entry_shares, 
        exit_date, exit_price, exit_shares, trade_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tradeId1,
        'AAPL',
        '2026-02-01',
        145.00,
        100,
        '2026-02-05',
        152.50,
        100,
        'manual',
        now,
        now,
      ]
    );
    console.log(`  ✅ Closed trade: AAPL (5% gain)`);

    await db.run(
      `INSERT OR IGNORE INTO trades 
       (id, ticker, entry_date, entry_price, entry_shares, 
        trade_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tradeId2,
        'MSFT',
        '2026-02-04',
        315.00,
        50,
        'manual',
        now,
        now,
      ]
    );
    console.log(`  ✅ Open trade: MSFT`);

    // Create sample portfolio positions
    console.log('\n💼 Inserting sample positions...');
    const posId = uuidv4();

    await db.run(
      `INSERT OR IGNORE INTO portfolio_positions 
       (id, ticker, entry_date, entry_price, current_shares, cost_basis, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        posId,
        'GOOGL',
        '2026-01-15',
        140.00,
        50,
        7000.00,
        now,
        now,
      ]
    );
    console.log(`  ✅ Position: GOOGL (50 shares)`);

    console.log('\n✨ Seed data inserted successfully!');
    console.log(`
Sample data summary:
  - 5 tickers with 25 days of price history
  - 1 scan with 2 buy/sell signals
  - 2 sample trades (1 closed, 1 open)
  - 1 portfolio position
    `);

    await closeDatabase();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
seedTestData();
