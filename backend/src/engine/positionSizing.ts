import {
  PositionSizingInput,
  PositionSizingOutput,
} from './types.js';

/**
 * Calculate position size based on Turtle Trading 2% risk rule
 *
 * Rules:
 * - Risk per trade = 2% of account balance
 * - Position size = Risk Amount / Stop Distance
 * - Max position capped at 20% of account (safety valve)
 */
export function calculatePositionSize(
  input: PositionSizingInput
): PositionSizingOutput {
  const riskPercent = input.riskPercent ?? 0.02; // Default 2%
  const riskAmount = input.accountBalance * riskPercent;
  const stopDistance = Math.abs(input.entryPrice - input.stopLossPrice);

  if (stopDistance === 0) {
    throw new Error('Stop loss distance cannot be zero');
  }

  let units = Math.floor(riskAmount / stopDistance);
  const positionSize = units * input.entryPrice;
  const maxPositionSize = input.accountBalance * 0.2; // 20% max

  // Apply safety valve: cap position at 20% of account
  if (positionSize > maxPositionSize) {
    units = Math.floor(maxPositionSize / input.entryPrice);
  }

  return {
    units,
    positionSize: units * input.entryPrice,
    riskAmount,
    stopDistance,
  };
}

/**
 * Validate position sizing parameters
 */
export function validatePositionSizing(
  input: PositionSizingInput
): { valid: boolean; error?: string } {
  if (input.accountBalance <= 0) {
    return { valid: false, error: 'Account balance must be positive' };
  }

  if (input.entryPrice <= 0) {
    return { valid: false, error: 'Entry price must be positive' };
  }

  if (input.stopLossPrice < 0) {
    return { valid: false, error: 'Stop loss price cannot be negative' };
  }

  if (input.entryPrice === input.stopLossPrice) {
    return {
      valid: false,
      error: 'Entry price and stop loss must be different',
    };
  }

  const riskPercent = input.riskPercent ?? 0.02;
  if (riskPercent <= 0 || riskPercent > 1) {
    return {
      valid: false,
      error: 'Risk percent must be between 0 and 1',
    };
  }

  return { valid: true };
}
