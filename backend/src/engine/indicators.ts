import { OHLC, HistoricalData } from '../types/index.js';
import { TurtleIndicators } from './types.js';

/**
 * Calculate N-day Donchian high
 */
function calculateDonchianHigh(prices: OHLC[], days: number): number {
  if (prices.length < days) {
    throw new Error(`Insufficient data for ${days}-day Donchian calculation`);
  }
  const lastN = prices.slice(-days);
  return Math.max(...lastN.map((p) => p.high));
}

/**
 * Calculate N-day Donchian low
 */
function calculateDonchianLow(prices: OHLC[], days: number): number {
  if (prices.length < days) {
    throw new Error(`Insufficient data for ${days}-day Donchian calculation`);
  }
  const lastN = prices.slice(-days);
  return Math.min(...lastN.map((p) => p.low));
}

/**
 * Calculate 20-day Donchian high (highest high over last 20 days)
 */
export function calculateDonchian20High(prices: OHLC[]): number {
  return calculateDonchianHigh(prices, 20);
}

/**
 * Calculate 20-day Donchian low (lowest low over last 20 days)
 */
export function calculateDonchian20Low(prices: OHLC[]): number {
  return calculateDonchianLow(prices, 20);
}

/**
 * Calculate 55-day Donchian high (for System 2)
 */
export function calculateDonchian55High(prices: OHLC[]): number {
  return calculateDonchianHigh(prices, 55);
}

/**
 * Calculate 55-day Donchian low (for System 2)
 */
export function calculateDonchian55Low(prices: OHLC[]): number {
  return calculateDonchianLow(prices, 55);
}

/**
 * Calculate 10-day Donchian high (highest high over last 10 days)
 */
export function calculateDonchian10High(prices: OHLC[]): number {
  return calculateDonchianHigh(prices, 10);
}

/**
 * Calculate 10-day Donchian low (lowest low over last 10 days)
 */
export function calculateDonchian10Low(prices: OHLC[]): number {
  return calculateDonchianLow(prices, 10);
}

/**
 * Calculate 200-day Simple Moving Average (trend filter)
 */
export function calculateMA200(prices: OHLC[]): number {
  if (prices.length < 200) {
    throw new Error('Insufficient data for 200-day MA calculation');
  }
  const last200 = prices.slice(-200);
  const sum = last200.reduce((acc, p) => acc + p.close, 0);
  return sum / 200;
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
 * Requires 200 days of data for MA200
 */
export function calculateTurtleIndicators(
  prices: OHLC[]
): TurtleIndicators {
  if (prices.length < 200) {
    throw new Error(
      'Insufficient historical data. Minimum 200 days required for full analysis.'
    );
  }

  return {
    donchian20High: calculateDonchian20High(prices),
    donchian20Low: calculateDonchian20Low(prices),
    donchian55High: calculateDonchian55High(prices),
    donchian55Low: calculateDonchian55Low(prices),
    donchian10High: calculateDonchian10High(prices),
    donchian10Low: calculateDonchian10Low(prices),
    atr14: calculateATR14(prices),
    ma200: calculateMA200(prices),
  };
}

/**
 * Validate that data has sufficient history and quality
 * Now requires 200+ days for full trend analysis
 */
export function validateHistoricalData(prices: OHLC[]): boolean {
  if (prices.length < 200) {
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
