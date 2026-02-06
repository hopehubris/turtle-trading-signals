import { OHLC, HistoricalData } from '../types/index.js';
import { TurtleIndicators } from './types.js';

/**
 * Calculate 20-day Donchian high (highest high over last 20 days)
 */
export function calculateDonchian20High(prices: OHLC[]): number {
  if (prices.length < 20) {
    throw new Error('Insufficient data for 20-day Donchian calculation');
  }
  const last20 = prices.slice(-20);
  return Math.max(...last20.map((p) => p.high));
}

/**
 * Calculate 20-day Donchian low (lowest low over last 20 days)
 */
export function calculateDonchian20Low(prices: OHLC[]): number {
  if (prices.length < 20) {
    throw new Error('Insufficient data for 20-day Donchian calculation');
  }
  const last20 = prices.slice(-20);
  return Math.min(...last20.map((p) => p.low));
}

/**
 * Calculate 10-day Donchian high (highest high over last 10 days)
 */
export function calculateDonchian10High(prices: OHLC[]): number {
  if (prices.length < 10) {
    throw new Error('Insufficient data for 10-day Donchian calculation');
  }
  const last10 = prices.slice(-10);
  return Math.max(...last10.map((p) => p.high));
}

/**
 * Calculate 10-day Donchian low (lowest low over last 10 days)
 */
export function calculateDonchian10Low(prices: OHLC[]): number {
  if (prices.length < 10) {
    throw new Error('Insufficient data for 10-day Donchian calculation');
  }
  const last10 = prices.slice(-10);
  return Math.min(...last10.map((p) => p.low));
}

/**
 * Calculate Average True Range (ATR) over 14 days
 * ATR = simple moving average of true range
 */
export function calculateATR14(prices: OHLC[]): number {
  if (prices.length < 14) {
    throw new Error('Insufficient data for ATR-14 calculation');
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const previous = prices[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trueRanges.push(tr);
  }

  const last14TR = trueRanges.slice(-14);
  const atr = last14TR.reduce((a, b) => a + b, 0) / 14;

  return atr;
}

/**
 * Calculate all Turtle Trading indicators for a given ticker
 */
export function calculateTurtleIndicators(
  prices: OHLC[]
): TurtleIndicators {
  if (prices.length < 21) {
    throw new Error(
      'Insufficient historical data. Minimum 21 days required.'
    );
  }

  return {
    donchian20High: calculateDonchian20High(prices),
    donchian20Low: calculateDonchian20Low(prices),
    donchian10High: calculateDonchian10High(prices),
    donchian10Low: calculateDonchian10Low(prices),
    atr14: calculateATR14(prices),
  };
}

/**
 * Validate that data has sufficient history and quality
 */
export function validateHistoricalData(prices: OHLC[]): boolean {
  if (prices.length < 21) {
    return false;
  }

  // Check for missing data
  for (const price of prices) {
    if (
      price.open <= 0 ||
      price.high <= 0 ||
      price.low <= 0 ||
      price.close <= 0
    ) {
      return false;
    }

    // High should be >= low
    if (price.high < price.low) {
      return false;
    }

    // Close should be between high and low (or very close due to rounding)
    if (price.close > price.high || price.close < price.low) {
      return false;
    }
  }

  return true;
}
