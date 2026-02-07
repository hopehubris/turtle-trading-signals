import {
  generateSignalV2,
  checkExitSignal,
  checkStopLoss,
  analyzeTrend,
} from '../../backend/src/engine/signals.js';
import { OHLC } from '../../backend/src/types/index.js';
import { ScanConfig } from '../../backend/src/engine/types.js';

// Helper to generate sample data
function generateSampleData(days: number, trend: 'up' | 'down' | 'neutral' = 'neutral'): OHLC[] {
  const data: OHLC[] = [];
  let basePrice = 100;

  for (let i = 0; i < days; i++) {
    const date = new Date(2025, 0, 1 + i);
    const dateStr = date.toISOString().split('T')[0];

    // Apply trend
    const trendFactor = trend === 'up' ? 0.5 : trend === 'down' ? -0.5 : 0;
    const change = (Math.random() - 0.5) * 2 + trendFactor;
    basePrice = Math.max(10, basePrice + change);

    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * 1;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.floor(Math.random() * 5000000) + 1000000;

    data.push({
      date: dateStr,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return data;
}

describe('Turtle Trading Signals v2', () => {
  describe('generateSignalV2 - Basic Validation', () => {
    it('should throw error with insufficient data (less than 200 days)', () => {
      const data = generateSampleData(199);

      expect(() => {
        const config: ScanConfig = {
          system: 'system1',
          useTrendFilter: true,
          riskPerTrade: 2,
          stopLossMultiplier: 2.0,
        };
        generateSignalV2('AAPL', data, config);
      }).toThrow('Insufficient historical data');
    });

    it('should return signal calculation with both system1 and system2 results', () => {
      const data = generateSampleData(250);

      const config: ScanConfig = {
        system: 'system1',
        useTrendFilter: false,
        riskPerTrade: 2,
        stopLossMultiplier: 2.0,
      };

      const result = generateSignalV2('AAPL', data, config);

      expect(result).toHaveProperty('ticker', 'AAPL');
      expect(result).toHaveProperty('system1');
      expect(result).toHaveProperty('system2');
      expect(result).toHaveProperty('trendAnalysis');
      expect(result).toHaveProperty('indicators');
    });

    it('should have 200-day MA in indicators', () => {
      const data = generateSampleData(250);

      const config: ScanConfig = {
        system: 'system1',
        useTrendFilter: false,
        riskPerTrade: 2,
        stopLossMultiplier: 2.0,
      };

      const result = generateSignalV2('AAPL', data, config);

      expect(result.indicators).toHaveProperty('ma200');
      expect(typeof result.indicators.ma200).toBe('number');
      expect(result.indicators.ma200).toBeGreaterThan(0);
    });
  });

  describe('analyzeTrend', () => {
    it('should identify uptrend when price > MA200', () => {
      // Generate uptrend data
      const data: OHLC[] = [];
      let price = 100;
      for (let i = 0; i < 250; i++) {
        price += 0.2; // Steady uptrend
        const date = new Date(2025, 0, 1 + i);
        const dateStr = date.toISOString().split('T')[0];
        data.push({
          date: dateStr,
          open: price,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000,
        });
      }

      const analysis = analyzeTrend(data);
      expect(analysis.context).toBe('uptrend');
      expect(analysis.isAboveMA200).toBe(true);
    });

    it('should identify downtrend when price < MA200', () => {
      // Generate downtrend data
      const data: OHLC[] = [];
      let price = 100;
      for (let i = 0; i < 250; i++) {
        price -= 0.2; // Steady downtrend
        const date = new Date(2025, 0, 1 + i);
        const dateStr = date.toISOString().split('T')[0];
        data.push({
          date: dateStr,
          open: price,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000,
        });
      }

      const analysis = analyzeTrend(data);
      expect(analysis.context).toBe('downtrend');
      expect(analysis.isAboveMA200).toBe(false);
    });
  });

  describe('checkExitSignal', () => {
    it('should return false with insufficient data', () => {
      const data: OHLC[] = [];
      for (let i = 0; i < 9; i++) {
        data.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000000,
        });
      }

      expect(checkExitSignal(data, 'long', 'system1')).toBe(false);
    });

    it('should return a boolean for valid data', () => {
      const data: OHLC[] = [];
      for (let i = 0; i < 15; i++) {
        data.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000000,
        });
      }

      const result = checkExitSignal(data, 'long', 'system1');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('checkStopLoss', () => {
    it('should trigger stop loss for long position when price <= stop', () => {
      const currentPrice = 95;
      const stopLossPrice = 100;

      const result = checkStopLoss(currentPrice, stopLossPrice, 'long');
      expect(result).toBe(true);
    });

    it('should not trigger stop loss for long position when price > stop', () => {
      const currentPrice = 105;
      const stopLossPrice = 100;

      const result = checkStopLoss(currentPrice, stopLossPrice, 'long');
      expect(result).toBe(false);
    });

    it('should trigger stop loss for short position when price >= stop', () => {
      const currentPrice = 105;
      const stopLossPrice = 100;

      const result = checkStopLoss(currentPrice, stopLossPrice, 'short');
      expect(result).toBe(true);
    });

    it('should not trigger stop loss for short position when price < stop', () => {
      const currentPrice = 95;
      const stopLossPrice = 100;

      const result = checkStopLoss(currentPrice, stopLossPrice, 'short');
      expect(result).toBe(false);
    });
  });
});
