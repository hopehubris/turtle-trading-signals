import { OHLC } from '../types/index.js';
import { calculateTurtleIndicators, validateHistoricalData } from './indicators.js';
import { SignalCalculation, TurtleIndicators } from './types.js';

/**
 * Generate Turtle Trading signals for a ticker based on latest OHLC data
 *
 * Rules:
 * - BUY: Close > 20-day highest high
 * - SELL: Close < 10-day lowest low
 * - STOP LOSS: Entry - (2 × ATR-14)
 */
export function generateSignal(
  ticker: string,
  prices: OHLC[]
): SignalCalculation {
  // Validate input
  if (!validateHistoricalData(prices)) {
    throw new Error(
      `Invalid historical data for ${ticker}. Requires 21+ days of valid OHLC data.`
    );
  }

  // Get the latest close
  const latestBar = prices[prices.length - 1];
  const date = latestBar.date;
  const close = latestBar.close;
  const currentPrice = close; // In live trading, this would be real-time price

  // Calculate all indicators
  const indicators = calculateTurtleIndicators(prices);

  // Check for buy signal: Close > 20-day highest high
  const buySignal = close > indicators.donchian20High;

  // Check for sell signal: Close < 10-day lowest low
  const sellSignal = close < indicators.donchian10Low;

  const calculation: SignalCalculation = {
    ticker,
    date,
    close,
    currentPrice,
    indicators,
    buySignal,
    sellSignal,
  };

  // Calculate entry price and stop loss if signal triggered
  if (buySignal) {
    calculation.entryPrice = close;
    // Stop loss for buy = entry - (2 × ATR)
    calculation.stopLoss = close - 2 * indicators.atr14;
    calculation.reason = `Close (${close.toFixed(2)}) > 20-day high (${indicators.donchian20High.toFixed(2)})`;
  }

  if (sellSignal) {
    calculation.entryPrice = close;
    // Stop loss for sell = entry + (2 × ATR)
    calculation.stopLoss = close + 2 * indicators.atr14;
    calculation.reason = `Close (${close.toFixed(2)}) < 10-day low (${indicators.donchian10Low.toFixed(2)})`;
  }

  return calculation;
}

/**
 * Check if an existing position should exit based on Turtle rules
 *
 * Rules:
 * - LONG EXIT: Close < 10-day lowest low
 * - SHORT EXIT: Close > 10-day highest high
 */
export function checkExitSignal(
  prices: OHLC[],
  positionType: 'long' | 'short'
): boolean {
  if (prices.length < 10) {
    return false;
  }

  const latestBar = prices[prices.length - 1];
  const close = latestBar.close;
  const last10High = Math.max(...prices.slice(-10).map((p) => p.high));
  const last10Low = Math.min(...prices.slice(-10).map((p) => p.low));

  if (positionType === 'long') {
    // Exit long if close < 10-day low
    return close < last10Low;
  } else {
    // Exit short if close > 10-day high
    return close > last10High;
  }
}

/**
 * Check if stop loss is hit
 */
export function checkStopLoss(
  currentPrice: number,
  stopLossPrice: number,
  positionType: 'long' | 'short'
): boolean {
  if (positionType === 'long') {
    // Long position stopped out if price falls below stop
    return currentPrice <= stopLossPrice;
  } else {
    // Short position stopped out if price rises above stop
    return currentPrice >= stopLossPrice;
  }
}
