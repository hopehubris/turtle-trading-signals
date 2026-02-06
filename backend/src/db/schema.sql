-- Signals Table: Store generated Turtle Trading signals
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK(signal_type IN ('buy', 'sell')),
  entry_price REAL NOT NULL,
  stop_loss_price REAL NOT NULL,
  entry_date TEXT NOT NULL,
  scan_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  signal_status TEXT DEFAULT 'pending' CHECK(signal_status IN ('pending', 'active', 'triggered', 'expired')),
  notes TEXT,
  
  FOREIGN KEY (scan_id) REFERENCES scan_history(id)
);

-- Trades Table: Manual trade entries + performance tracking
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  entry_price REAL NOT NULL,
  entry_shares INTEGER NOT NULL,
  exit_date TEXT,
  exit_price REAL,
  exit_shares INTEGER,
  trade_type TEXT NOT NULL CHECK(trade_type IN ('manual', 'csv_import', 'signal_followup')),
  source_signal_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (source_signal_id) REFERENCES signals(id)
);

-- Scan History Table: Track daily scans and their results
CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  scan_timestamp TEXT NOT NULL,
  scan_trigger TEXT NOT NULL CHECK(scan_trigger IN ('scheduled', 'manual')),
  tickers_scanned INTEGER,
  signals_generated INTEGER,
  buy_signals INTEGER,
  sell_signals INTEGER,
  scan_status TEXT NOT NULL CHECK(scan_status IN ('in_progress', 'completed', 'failed')),
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Positions Table: Current open positions for overlay
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  entry_date TEXT NOT NULL,
  entry_price REAL NOT NULL,
  current_shares INTEGER NOT NULL,
  cost_basis REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Russell 2000 Cache Table: Cache daily price data
CREATE TABLE IF NOT EXISTS price_cache (
  ticker TEXT NOT NULL,
  date TEXT NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (ticker, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_signals_ticker ON signals(ticker);
CREATE INDEX IF NOT EXISTS idx_signals_date ON signals(entry_date);
CREATE INDEX IF NOT EXISTS idx_signals_scan ON signals(scan_id);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(signal_status);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_source_signal ON trades(source_signal_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_timestamp ON scan_history(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_price_cache_ticker_date ON price_cache(ticker, date);
