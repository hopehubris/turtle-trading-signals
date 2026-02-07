/**
 * Data Analytics Service
 * 
 * Analyzes cached price data to provide market insights:
 * - Top movers/losers
 * - Price levels (ATH, ATL, 52-week highs)
 * - Technical indicators (EMA, RSI, Bollinger Bands)
 * - Volatility metrics
 */

import { OHLC } from '../types/index.js';

export interface StockMetrics {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  percentFromHigh: number;
  percentFromLow: number;
  ema20: number;
  ema50: number;
  ema200: number;
  priceVsEma200: number;
  rsi14: number;
  atr14: number;
  volatility: number;
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateATR(data: OHLC[], period: number = 14): number {
  if (data.length < period) {
    return data[data.length - 1].high - data[data.length - 1].low;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trueRanges.push(tr);
  }

  const last14 = trueRanges.slice(-period);
  return last14.reduce((a, b) => a + b, 0) / period;
}

export function calculateVolatility(prices: number[], period: number = 20): number {
  if (prices.length < period) return 0;

  const last20 = prices.slice(-period);
  const mean = last20.reduce((a, b) => a + b) / period;
  const variance = last20.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return (stdDev / mean) * 100; // Coefficient of variation as %
}

export function analyzeStockMetrics(ticker: string, data: OHLC[]): StockMetrics {
  if (data.length === 0) {
    throw new Error(`No data for ${ticker}`);
  }

  const closes = data.map(d => d.close);
  const currentPrice = closes[closes.length - 1];
  const previousPrice = closes[closes.length - 2] || currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = (change / previousPrice) * 100;

  const high52w = Math.max(...data.map(d => d.high));
  const low52w = Math.min(...data.map(d => d.low));

  const percentFromHigh = ((currentPrice - high52w) / high52w) * 100;
  const percentFromLow = ((currentPrice - low52w) / low52w) * 100;

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  const priceVsEma200 = ((currentPrice - ema200) / ema200) * 100;
  const rsi14 = calculateRSI(closes, 14);
  const atr14 = calculateATR(data, 14);
  const volatility = calculateVolatility(closes, 20);

  return {
    ticker,
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    high52w: parseFloat(high52w.toFixed(2)),
    low52w: parseFloat(low52w.toFixed(2)),
    percentFromHigh: parseFloat(percentFromHigh.toFixed(2)),
    percentFromLow: parseFloat(percentFromLow.toFixed(2)),
    ema20: parseFloat(ema20.toFixed(2)),
    ema50: parseFloat(ema50.toFixed(2)),
    ema200: parseFloat(ema200.toFixed(2)),
    priceVsEma200: parseFloat(priceVsEma200.toFixed(2)),
    rsi14: parseFloat(rsi14.toFixed(2)),
    atr14: parseFloat(atr14.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
  };
}

export function getTopMovers(
  metrics: StockMetrics[],
  type: 'gainers' | 'losers' | 'most-volatile',
  limit: number = 20
): StockMetrics[] {
  let sorted: StockMetrics[];

  switch (type) {
    case 'gainers':
      sorted = [...metrics].sort((a, b) => b.changePercent - a.changePercent);
      break;
    case 'losers':
      sorted = [...metrics].sort((a, b) => a.changePercent - b.changePercent);
      break;
    case 'most-volatile':
      sorted = [...metrics].sort((a, b) => b.volatility - a.volatility);
      break;
  }

  return sorted.slice(0, limit);
}

export function getNearLevels(
  metrics: StockMetrics[],
  type: 'near-ath' | 'near-atl' | 'near-ema200',
  threshold: number = 5 // percentage
): StockMetrics[] {
  return metrics.filter(m => {
    switch (type) {
      case 'near-ath':
        return m.percentFromHigh >= -threshold && m.percentFromHigh <= 0;
      case 'near-atl':
        return m.percentFromLow <= threshold && m.percentFromLow >= 0;
      case 'near-ema200':
        return Math.abs(m.priceVsEma200) <= threshold;
    }
  }).sort((a, b) => {
    switch (type) {
      case 'near-ath':
        return b.percentFromHigh - a.percentFromHigh;
      case 'near-atl':
        return a.percentFromLow - b.percentFromLow;
      case 'near-ema200':
        return Math.abs(b.priceVsEma200) - Math.abs(a.priceVsEma200);
    }
  });
}

export function getExtremeRSI(
  metrics: StockMetrics[],
  type: 'overbought' | 'oversold',
  threshold: number = type === 'overbought' ? 70 : 30
): StockMetrics[] {
  const filtered = metrics.filter(m => {
    return type === 'overbought' ? m.rsi14 >= threshold : m.rsi14 <= threshold;
  }).sort((a, b) => {
    return type === 'overbought' ? b.rsi14 - a.rsi14 : a.rsi14 - b.rsi14;
  });

  return filtered;
}
