import {
  generateSignal,
  checkExitSignal,
  checkStopLoss,
} from '../../backend/src/engine/signals.js';
import { OHLC } from '../../backend/src/types/index.js';

describe('Turtle Trading Signals', () => {
  describe('generateSignal - Basic Validation', () => {
    it('should throw error with insufficient data', () => {
      const data: OHLC[] = [];
      for (let i = 0; i < 20; i++) {
        data.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000000,
        });
      }

      expect(() => generateSignal('AAPL', data)).toThrow(
        'Invalid historical data'
      );
    });

    it('should throw error with invalid OHLC data', () => {
      const data: OHLC[] = [];
      for (let i = 0; i < 21; i++) {
        data.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000000,
        });
      }

      // Corrupt the data - high < low
      data[10].high = data[10].low - 10;

      expect(() => generateSignal('AAPL', data)).toThrow();
    });

    it('should return a signal calculation object with required fields', () => {
      const data: OHLC[] = [];
      for (let i = 0; i < 21; i++) {
        data.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000000,
        });
      }

      const result = generateSignal('AAPL', data);

      expect(result).toHaveProperty('ticker', 'AAPL');
      expect(result).toHaveProperty('close');
      expect(result).toHaveProperty('buySignal');
      expect(result).toHaveProperty('sellSignal');
      expect(result).toHaveProperty('indicators');
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

      expect(checkExitSignal(data, 'long')).toBe(false);
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

      const result = checkExitSignal(data, 'long');
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

    it('should trigger stop loss at exact price for long', () => {
      const currentPrice = 100;
      const stopLossPrice = 100;

      const result = checkStopLoss(currentPrice, stopLossPrice, 'long');
      expect(result).toBe(true);
    });

    it('should trigger stop loss at exact price for short', () => {
      const currentPrice = 100;
      const stopLossPrice = 100;

      const result = checkStopLoss(currentPrice, stopLossPrice, 'short');
      expect(result).toBe(true);
    });
  });
});
