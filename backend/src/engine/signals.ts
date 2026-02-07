/**
 * Turtle Trading Signal Engine v2
 * 
 * Implements both classic Turtle Trading systems with configurable rules:
 * - System 1: 20-day breakout (aggressive, catches trends early)
 * - System 2: 55-day breakout (conservative, fewer false signals)
 * - Trend Filter: 200-day MA to avoid counter-trend trades
 */

import { OHLC } from '../types/index.js';
import { calculateTurtleIndicators, validateHistoricalData } from './indicators.js';
import {
  SignalCalculation,
  TrendAnalysis,
  TrendContext,
  TurtleSystem,
  ScanConfig,
} from './types.js';

/**
 * Analyze the primary trend using 200-day MA
 * Returns whether we're in an uptrend, downtrend, or neutral
 */
export function analyzeTrend(prices: OHLC[]): TrendAnalysis {
  if (prices.length < 200) {
    return {
      context: 'neutral',
      ma200: 0,
      price: prices[prices.length - 1].close,
      isAboveMA200: false,
      strength: 0,
    };
  }

  const last200 = prices.slice(-200);
  const ma200Sum = last200.reduce((acc, p) => acc + p.close, 0);
  const ma200 = ma200Sum / 200;
  const currentPrice = prices[prices.length - 1].close;
  const isAboveMA200 = currentPrice > ma200;

  // Strength: how far from MA as a percentage
  const distance = Math.abs(currentPrice - ma200);
  const strength = Math.min(distance / ma200, 1); // 0-1 scale

  const context: TrendContext = isAboveMA200 ? 'uptrend' : 'downtrend';

  return {
    context,
    ma200,
    price: currentPrice,
    isAboveMA200,
    strength,
  };
}

/**
 * Generate System 1 signals (20-day breakout)
 * More aggressive: catches trends early
 */
function generateSystem1Signal(
  ticker: string,
  prices: OHLC[],
  indicators: any,
  trendAnalysis: TrendAnalysis,
  config: ScanConfig
) {
  const latestBar = prices[prices.length - 1];
  const date = latestBar.date;
  const close = latestBar.close;

  let buySignal = false;
  let sellSignal = false;
  let reason = '';
  let trendFiltered = false;

  // Check for buy signal: Close > 20-day highest high
  if (close > indicators.donchian20High) {
    // Apply trend filter if enabled: only buy in uptrends
    if (config.useTrendFilter && !trendAnalysis.isAboveMA200) {
      trendFiltered = true;
      reason = `Breakout above 20-day high (${indicators.donchian20High.toFixed(2)}) but FILTERED: price below 200-day MA (${trendAnalysis.ma200.toFixed(2)})`;
    } else {
      buySignal = true;
      reason = `Close (${close.toFixed(2)}) > 20-day high (${indicators.donchian20High.toFixed(2)})`;
    }
  }

  // Check for sell signal: Close < 10-day lowest low
  if (close < indicators.donchian10Low) {
    // Apply trend filter if enabled: only sell in downtrends
    if (config.useTrendFilter && trendAnalysis.isAboveMA200) {
      trendFiltered = true;
      reason = `Breakout below 10-day low (${indicators.donchian10Low.toFixed(2)}) but FILTERED: price above 200-day MA (${trendAnalysis.ma200.toFixed(2)})`;
    } else {
      sellSignal = true;
      reason = `Close (${close.toFixed(2)}) < 10-day low (${indicators.donchian10Low.toFixed(2)})`;
    }
  }

  const entryPrice = buySignal || sellSignal ? close : undefined;
  const stopLossMultiplier = config.stopLossMultiplier || 2.0;
  const stopLoss = entryPrice
    ? buySignal
      ? entryPrice - stopLossMultiplier * indicators.atr14
      : entryPrice + stopLossMultiplier * indicators.atr14
    : undefined;

  return {
    buySignal,
    sellSignal,
    entryPrice,
    stopLoss,
    reason,
    trendFiltered,
  };
}

/**
 * Generate System 2 signals (55-day breakout)
 * More conservative: confirms established trends
 */
function generateSystem2Signal(
  ticker: string,
  prices: OHLC[],
  indicators: any,
  trendAnalysis: TrendAnalysis,
  config: ScanConfig
) {
  const latestBar = prices[prices.length - 1];
  const date = latestBar.date;
  const close = latestBar.close;

  let buySignal = false;
  let sellSignal = false;
  let reason = '';
  let trendFiltered = false;

  // Check for buy signal: Close > 55-day highest high
  if (close > indicators.donchian55High) {
    // Apply trend filter if enabled: only buy in uptrends
    if (config.useTrendFilter && !trendAnalysis.isAboveMA200) {
      trendFiltered = true;
      reason = `Breakout above 55-day high (${indicators.donchian55High.toFixed(2)}) but FILTERED: price below 200-day MA (${trendAnalysis.ma200.toFixed(2)})`;
    } else {
      buySignal = true;
      reason = `Close (${close.toFixed(2)}) > 55-day high (${indicators.donchian55High.toFixed(2)})`;
    }
  }

  // Check for sell signal: Close < 20-day lowest low (tighter exit than System 1)
  if (close < indicators.donchian20Low) {
    // Apply trend filter if enabled: only sell in downtrends
    if (config.useTrendFilter && trendAnalysis.isAboveMA200) {
      trendFiltered = true;
      reason = `Breakout below 20-day low (${indicators.donchian20Low.toFixed(2)}) but FILTERED: price above 200-day MA (${trendAnalysis.ma200.toFixed(2)})`;
    } else {
      sellSignal = true;
      reason = `Close (${close.toFixed(2)}) < 20-day low (${indicators.donchian20Low.toFixed(2)})`;
    }
  }

  const entryPrice = buySignal || sellSignal ? close : undefined;
  const stopLossMultiplier = config.stopLossMultiplier || 1.5; // Smaller stop for System 2
  const stopLoss = entryPrice
    ? buySignal
      ? entryPrice - stopLossMultiplier * indicators.atr14
      : entryPrice + stopLossMultiplier * indicators.atr14
    : undefined;

  return {
    buySignal,
    sellSignal,
    entryPrice,
    stopLoss,
    reason,
    trendFiltered,
  };
}

/**
 * Generate Turtle Trading signals with configurable rules
 */
export function generateSignalV2(
  ticker: string,
  prices: OHLC[],
  config: ScanConfig = {
    system: 'system1',
    useTrendFilter: true,
    riskPerTrade: 2,
    stopLossMultiplier: 2.0,
  }
): SignalCalculation {
  // Validate input
  if (!validateHistoricalData(prices)) {
    throw new Error(
      `Invalid historical data for ${ticker}. Requires 200+ days of valid OHLC data.`
    );
  }

  // Calculate all indicators
  const indicators = calculateTurtleIndicators(prices);
  const trendAnalysis = analyzeTrend(prices);

  // Generate signals for both systems
  const system1 = generateSystem1Signal(ticker, prices, indicators, trendAnalysis, config);
  const system2 = generateSystem2Signal(ticker, prices, indicators, trendAnalysis, config);

  const calculation: SignalCalculation = {
    ticker,
    date: prices[prices.length - 1].date,
    close: prices[prices.length - 1].close,
    currentPrice: prices[prices.length - 1].close,
    indicators,
    trendAnalysis,
    system1,
    system2,
  };

  return calculation;
}

/**
 * Check if a position should exit based on Turtle rules
 */
export function checkExitSignal(
  prices: OHLC[],
  positionType: 'long' | 'short',
  system: TurtleSystem = 'system1'
): boolean {
  if (prices.length < 10) {
    return false;
  }

  const latestBar = prices[prices.length - 1];
  const close = latestBar.close;

  if (system === 'system1') {
    // System 1: Exit on 10-day breakout
    const last10High = Math.max(...prices.slice(-10).map((p) => p.high));
    const last10Low = Math.min(...prices.slice(-10).map((p) => p.low));

    if (positionType === 'long') {
      return close < last10Low;
    } else {
      return close > last10High;
    }
  } else {
    // System 2: Exit on 20-day breakout (tighter)
    const last20High = Math.max(...prices.slice(-20).map((p) => p.high));
    const last20Low = Math.min(...prices.slice(-20).map((p) => p.low));

    if (positionType === 'long') {
      return close < last20Low;
    } else {
      return close > last20High;
    }
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
    return currentPrice <= stopLossPrice;
  } else {
    return currentPrice >= stopLossPrice;
  }
}
