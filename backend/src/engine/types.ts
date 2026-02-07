// Internal types for signal engine calculations

export type TurtleSystem = 'system1' | 'system2';
export type TrendContext = 'uptrend' | 'downtrend' | 'neutral';

export interface TurtleIndicators {
  donchian20High: number;
  donchian20Low: number;
  donchian55High: number;
  donchian55Low: number;
  donchian10High: number;
  donchian10Low: number;
  atr14: number;
  ma200: number;
}

export interface TrendAnalysis {
  context: TrendContext;
  ma200: number;
  price: number;
  isAboveMA200: boolean;
  strength: number; // 0-1, how far above/below MA
}

export interface SignalCalculation {
  ticker: string;
  date: string;
  close: number;
  currentPrice: number;
  indicators: TurtleIndicators;
  trendAnalysis: TrendAnalysis;
  system1: {
    buySignal: boolean;
    sellSignal: boolean;
    entryPrice?: number;
    stopLoss?: number;
    reason?: string;
    trendFiltered?: boolean; // true if signal was rejected by trend filter
  };
  system2: {
    buySignal: boolean;
    sellSignal: boolean;
    entryPrice?: number;
    stopLoss?: number;
    reason?: string;
    trendFiltered?: boolean; // true if signal was rejected by trend filter
  };
}

export interface PositionSizingInput {
  accountBalance: number;
  entryPrice: number;
  stopLossPrice: number;
  riskPercent?: number; // default 2%
}

export interface PositionSizingOutput {
  units: number;
  positionSize: number;
  riskAmount: number;
  stopDistance: number;
}

export interface ScanConfig {
  system: TurtleSystem; // which system to use
  useTrendFilter: boolean; // enable 200-day MA filter
  riskPerTrade: number; // default 2%
  stopLossMultiplier: number; // default 2.0 for system1, 1.5 for system2
}
