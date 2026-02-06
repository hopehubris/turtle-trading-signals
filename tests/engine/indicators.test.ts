import {
  calculateDonchian20High,
  calculateDonchian20Low,
  calculateDonchian10High,
  calculateDonchian10Low,
  calculateATR14,
  calculateTurtleIndicators,
  validateHistoricalData,
} from '../../backend/src/engine/indicators.js';
import { OHLC } from '../../backend/src/types/index.js';

describe('Turtle Trading Indicators', () => {
  // Generate sample OHLC data
  function generateSampleData(days: number): OHLC[] {
    const data: OHLC[] = [];
    let basePrice = 100;

    for (let i = 0; i < days; i++) {
      const date = new Date(2026, 0, 1 + i);
      const dateStr = date.toISOString().split('T')[0];

      // Slight random walk
      const change = (Math.random() - 0.5) * 5;
      basePrice += change;

      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * 2;
      const high = Math.max(open, close) + Math.random() * 3;
      const low = Math.min(open, close) - Math.random() * 3;
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

  describe('calculateDonchian20High', () => {
    it('should calculate highest high of last 20 days', () => {
      const data = generateSampleData(21);
      const result = calculateDonchian20High(data);

      // Verify it's actually the max of last 20
      const last20Highs = data.slice(-20).map(p => p.high);
      const expectedMax = Math.max(...last20Highs);

      expect(result).toEqual(expectedMax);
    });

    it('should throw error with insufficient data', () => {
      const data = generateSampleData(19);
      expect(() => calculateDonchian20High(data)).toThrow(
        'Insufficient data for 20-day Donchian calculation'
      );
    });
  });

  describe('calculateDonchian20Low', () => {
    it('should calculate lowest low of last 20 days', () => {
      const data = generateSampleData(21);
      const result = calculateDonchian20Low(data);

      const last20Lows = data.slice(-20).map(p => p.low);
      const expectedMin = Math.min(...last20Lows);

      expect(result).toEqual(expectedMin);
    });

    it('should throw error with insufficient data', () => {
      const data = generateSampleData(19);
      expect(() => calculateDonchian20Low(data)).toThrow();
    });
  });

  describe('calculateDonchian10High', () => {
    it('should calculate highest high of last 10 days', () => {
      const data = generateSampleData(21);
      const result = calculateDonchian10High(data);

      const last10Highs = data.slice(-10).map(p => p.high);
      const expectedMax = Math.max(...last10Highs);

      expect(result).toEqual(expectedMax);
    });

    it('should throw error with insufficient data', () => {
      const data = generateSampleData(9);
      expect(() => calculateDonchian10High(data)).toThrow();
    });
  });

  describe('calculateDonchian10Low', () => {
    it('should calculate lowest low of last 10 days', () => {
      const data = generateSampleData(21);
      const result = calculateDonchian10Low(data);

      const last10Lows = data.slice(-10).map(p => p.low);
      const expectedMin = Math.min(...last10Lows);

      expect(result).toEqual(expectedMin);
    });

    it('should throw error with insufficient data', () => {
      const data = generateSampleData(9);
      expect(() => calculateDonchian10Low(data)).toThrow();
    });
  });

  describe('calculateATR14', () => {
    it('should calculate 14-day ATR correctly', () => {
      const data = generateSampleData(21);
      const result = calculateATR14(data);

      // ATR should be positive and reasonable
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100); // Sanity check
    });

    it('should calculate true range correctly', () => {
      // Create data with known true ranges
      const data: OHLC[] = [
        {
          date: '2026-01-01',
          open: 100,
          high: 110,
          low: 95,
          close: 105,
          volume: 1000000,
        },
        {
          date: '2026-01-02',
          open: 105,
          high: 115,
          low: 100,
          close: 110,
          volume: 1000000,
        },
      ];

      // Fill remaining days with similar data
      for (let i = 2; i < 21; i++) {
        data.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          open: 110,
          high: 115,
          low: 105,
          close: 110,
          volume: 1000000,
        });
      }

      const result = calculateATR14(data);
      expect(result).toBeGreaterThan(0);
    });

    it('should throw error with insufficient data', () => {
      const data = generateSampleData(13);
      expect(() => calculateATR14(data)).toThrow();
    });
  });

  describe('calculateTurtleIndicators', () => {
    it('should return all four Donchian values and ATR', () => {
      const data = generateSampleData(21);
      const result = calculateTurtleIndicators(data);

      expect(result).toHaveProperty('donchian20High');
      expect(result).toHaveProperty('donchian20Low');
      expect(result).toHaveProperty('donchian10High');
      expect(result).toHaveProperty('donchian10Low');
      expect(result).toHaveProperty('atr14');

      // Basic sanity checks
      expect(result.donchian20High).toBeGreaterThan(result.donchian20Low);
      expect(result.donchian10High).toBeGreaterThan(result.donchian10Low);
      expect(result.atr14).toBeGreaterThan(0);
    });

    it('should throw error with insufficient data', () => {
      const data = generateSampleData(20);
      expect(() => calculateTurtleIndicators(data)).toThrow(
        'Insufficient historical data. Minimum 21 days required.'
      );
    });
  });

  describe('validateHistoricalData', () => {
    it('should return true for valid data', () => {
      const data = generateSampleData(21);
      expect(validateHistoricalData(data)).toBe(true);
    });

    it('should return false with insufficient data', () => {
      const data = generateSampleData(20);
      expect(validateHistoricalData(data)).toBe(false);
    });

    it('should return false if OHLC values are invalid', () => {
      const data = generateSampleData(21);
      // Corrupt high/low relationship
      data[10].high = data[10].low - 5;
      expect(validateHistoricalData(data)).toBe(false);
    });

    it('should return false if close is outside high/low range', () => {
      const data = generateSampleData(21);
      data[10].close = data[10].high + 10;
      expect(validateHistoricalData(data)).toBe(false);
    });

    it('should return false if any price is zero or negative', () => {
      const data = generateSampleData(21);
      data[10].close = -5;
      expect(validateHistoricalData(data)).toBe(false);
    });
  });
});
