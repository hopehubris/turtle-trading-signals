// Internal types for signal engine calculations

export interface TurtleIndicators {
  donchian20High: number;
  donchian20Low: number;
  donchian10High: number;
  donchian10Low: number;
  atr14: number;
}

export interface SignalCalculation {
  ticker: string;
  date: string;
  close: number;
  currentPrice: number;
  indicators: TurtleIndicators;
  buySignal: boolean;
  sellSignal: boolean;
  entryPrice?: number;
  stopLoss?: number;
  reason?: string;
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
