import {
  calculatePositionSize,
  validatePositionSizing,
} from '../../backend/src/engine/positionSizing.js';
import { PositionSizingInput } from '../../backend/src/engine/types.js';

describe('Position Sizing', () => {
  describe('calculatePositionSize', () => {
    it('should calculate units based on 2% risk rule without exceeding cap', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 100,
        stopLossPrice: 95, // Risk = $5 per share
        // Risk 2% = $2000
        // Units = $2000 / $5 = 400
        // Position = 400 * $100 = $40,000 = 40% > 20% cap
        // Capped at $20,000 = 200 shares
      };

      const result = calculatePositionSize(input);

      const expectedRiskAmount = 100000 * 0.02; // $2000
      const expectedStopDistance = 100 - 95; // $5
      const maxPositionSize = 100000 * 0.2; // $20,000
      const expectedUnits = Math.floor(maxPositionSize / 100); // 200

      expect(result.riskAmount).toBe(expectedRiskAmount);
      expect(result.stopDistance).toBe(expectedStopDistance);
      expect(result.units).toBe(expectedUnits);
      expect(result.positionSize).toBe(expectedUnits * 100);
    });

    it('should cap position at 20% of account', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 100,
        stopLossPrice: 99, // Stop distance = $1
      };

      const result = calculatePositionSize(input);

      const maxPositionSize = 100000 * 0.2; // $20,000
      expect(result.positionSize).toBeLessThanOrEqual(maxPositionSize);
      expect(result.units).toBe(Math.floor(maxPositionSize / 100));
    });

    it('should handle short positions correctly', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 100,
        stopLossPrice: 105, // Short: stop is above entry
        riskPercent: 0.02,
      };

      const result = calculatePositionSize(input);

      const stopDistance = Math.abs(100 - 105); // $5
      const riskAmount = 100000 * 0.02; // $2000
      // Would be 400 units but capped at 20% = 200
      const maxPositionSize = 100000 * 0.2; // $20,000
      const expectedUnits = Math.floor(maxPositionSize / 100);

      expect(result.stopDistance).toBe(stopDistance);
      expect(result.units).toBe(expectedUnits);
    });

    it('should respect custom risk percent', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 100,
        stopLossPrice: 95, // Stop distance = $5
        riskPercent: 0.05, // 5% instead of 2%
      };

      const result = calculatePositionSize(input);

      const expectedRiskAmount = 100000 * 0.05; // $5000
      // Uncapped: $5000 / $5 = 1000 units
      // But capped at 20% = $20,000 = 200 units
      const maxPositionSize = 100000 * 0.2;
      const expectedUnits = Math.floor(maxPositionSize / 100);

      expect(result.riskAmount).toBe(expectedRiskAmount);
      expect(result.units).toBe(expectedUnits);
    });

    it('should handle small account balances', () => {
      const input: PositionSizingInput = {
        accountBalance: 5000,
        entryPrice: 50,
        stopLossPrice: 48, // Stop distance = $2
      };

      const result = calculatePositionSize(input);

      const expectedRiskAmount = 5000 * 0.02; // $100
      // Uncapped units = $100 / $2 = 50
      // Position = 50 * $50 = $2500 = 50% > 20% cap of $1000
      // So actually capped at $1000 = 20 units
      const maxPositionSize = 5000 * 0.2; // $1000
      const cappedUnits = Math.floor(maxPositionSize / 50); // 20

      expect(result.riskAmount).toBe(expectedRiskAmount);
      expect(result.units).toBe(cappedUnits);
      expect(result.positionSize).toBe(cappedUnits * 50);
    });

    it('should throw error when stop distance is zero', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 100,
        stopLossPrice: 100, // Same as entry - invalid
      };

      expect(() => calculatePositionSize(input)).toThrow(
        'Stop loss distance cannot be zero'
      );
    });
  });

  describe('validatePositionSizing', () => {
    const validInput: PositionSizingInput = {
      accountBalance: 100000,
      entryPrice: 150,
      stopLossPrice: 145,
    };

    it('should return valid=true for correct input', () => {
      const result = validatePositionSizing(validInput);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject zero account balance', () => {
      const input: PositionSizingInput = {
        ...validInput,
        accountBalance: 0,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Account balance');
    });

    it('should reject negative account balance', () => {
      const input: PositionSizingInput = {
        ...validInput,
        accountBalance: -5000,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Account balance');
    });

    it('should reject zero entry price', () => {
      const input: PositionSizingInput = {
        ...validInput,
        entryPrice: 0,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Entry price');
    });

    it('should reject negative entry price', () => {
      const input: PositionSizingInput = {
        ...validInput,
        entryPrice: -100,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Entry price');
    });

    it('should reject negative stop loss price', () => {
      const input: PositionSizingInput = {
        ...validInput,
        stopLossPrice: -50,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Stop loss');
    });

    it('should reject when entry equals stop loss', () => {
      const input: PositionSizingInput = {
        ...validInput,
        entryPrice: 100,
        stopLossPrice: 100,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Entry price and stop loss must be different');
    });

    it('should reject invalid risk percent', () => {
      const input: PositionSizingInput = {
        ...validInput,
        riskPercent: 0,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Risk percent');
    });

    it('should reject risk percent > 100%', () => {
      const input: PositionSizingInput = {
        ...validInput,
        riskPercent: 1.5,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Risk percent');
    });

    it('should accept risk percent of exactly 1.0 (100%)', () => {
      const input: PositionSizingInput = {
        ...validInput,
        riskPercent: 1.0,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(true);
    });

    it('should accept risk percent of exactly 0.01 (1%)', () => {
      const input: PositionSizingInput = {
        ...validInput,
        riskPercent: 0.01,
      };
      const result = validatePositionSizing(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('Integration: Validation + Calculation', () => {
    it('should validate before calculating', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 150,
        stopLossPrice: 145,
      };

      // Validate first
      const validation = validatePositionSizing(input);
      expect(validation.valid).toBe(true);

      // Then calculate
      const result = calculatePositionSize(input);
      expect(result.units).toBeGreaterThan(0);
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle edge case: very tight stop', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 100,
        stopLossPrice: 99.50, // Very tight stop of $0.50
      };

      const validation = validatePositionSizing(input);
      expect(validation.valid).toBe(true);

      const result = calculatePositionSize(input);
      // Risk: $2000, Stop distance: $0.50
      // Uncapped units: 4000, but capped at 20% = $20,000 = 200 shares
      expect(result.units).toBe(200);
    });

    it('should handle edge case: very loose stop', () => {
      const input: PositionSizingInput = {
        accountBalance: 100000,
        entryPrice: 100,
        stopLossPrice: 80, // Loose stop of $20
      };

      const validation = validatePositionSizing(input);
      expect(validation.valid).toBe(true);

      const result = calculatePositionSize(input);
      // Risk: $2000, Stop distance: $20
      // Units: 100
      expect(result.units).toBe(100);
    });
  });
});
