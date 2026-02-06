// Signal Types
export type SignalType = 'buy' | 'sell';
export type SignalStatus = 'pending' | 'active' | 'triggered' | 'expired';
export type ScanTrigger = 'scheduled' | 'manual';
export type ScanStatus = 'in_progress' | 'completed' | 'failed';
export type TradeType = 'manual' | 'csv_import' | 'signal_followup';

export interface OHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  [ticker: string]: OHLC[];
}

export interface Signal {
  id: string;
  ticker: string;
  signalType: SignalType;
  entryPrice: number;
  stopLossPrice: number;
  entryDate: string;
  scanId: string;
  createdAt: string;
  signalStatus: SignalStatus;
  notes?: string;
}

export interface Trade {
  id: string;
  ticker: string;
  entryDate: string;
  entryPrice: number;
  entryShares: number;
  exitDate?: string;
  exitPrice?: number;
  exitShares?: number;
  tradeType: TradeType;
  sourceSignalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  id: string;
  scanTimestamp: string;
  scanTrigger: ScanTrigger;
  tickersScanned: number;
  signalsGenerated: number;
  buySignals: number;
  sellSignals: number;
  scanStatus: ScanStatus;
  errorMessage?: string;
  executionTimeMs: number;
  createdAt: string;
}

export interface PortfolioPosition {
  id: string;
  ticker: string;
  entryDate: string;
  entryPrice: number;
  currentShares: number;
  costBasis: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradePerformance {
  ticker: string;
  entryDate: string;
  entryPrice: number;
  entryShares: number;
  exitDate?: string;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  holdDays?: number;
  status: 'open' | 'closed';
}

export interface AnalyticsMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  averagePnL: number;
  averagePnLPercent: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}

export interface PortfolioOverlay {
  currentPositions: PortfolioPosition[];
  newSignals: Signal[];
  conflicts: SignalConflict[];
}

export interface SignalConflict {
  ticker: string;
  currentPosition: PortfolioPosition;
  newSignal: Signal;
  conflictType: 'same_direction' | 'opposite_direction';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ScanStartRequest {
  trigger: ScanTrigger;
  tickersOverride?: string[];
}

export interface TradeImportRecord {
  ticker: string;
  entryDate: string;
  entryPrice: number;
  entryShares: number;
  exitDate?: string;
  exitPrice?: number;
  exitShares?: number;
}

export interface AdminSettings {
  russelThreshold: number; // Market cap threshold for Russell 2000
  minVolumeFilter: number; // Minimum daily volume
  liquidityFilter: boolean;
  scanTime: string; // e.g., "16:00" for 4 PM ET
}
