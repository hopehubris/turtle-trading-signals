#!/usr/bin/env node
import { generateSignalV2 } from './dist/backend/src/engine/signals.js';

const prices = [];

// 200 days baseline
for (let i = 0; i < 200; i++) {
  const date = new Date(2024, 6, 1 + i);
  prices.push({
    date: date.toISOString().split('T')[0],
    open: 100, high: 101, low: 99, close: 100, volume: 1000000
  });
}

// Days 200-219: establish 20-day highs (last 20 bars before today)
for (let i = 200; i < 220; i++) {
  const date = new Date(2024, 6, 1 + i);
  prices.push({
    date: date.toISOString().split('T')[0],
    open: 102, high: 104, low: 101, close: 103, volume: 1000000
  });
}

// Day 220: TODAY - CLOSE ABOVE all previous 20 days
const date220 = new Date(2024, 6, 1 + 220);
prices.push({
  date: date220.toISOString().split('T')[0],
  open: 104,
  high: 105,
  low: 103,
  close: 104.5, // Above 104
  volume: 1000000
});

console.log(`Total bars: ${prices.length}`);
const last20 = prices.slice(-20);
const last20High = Math.max(...last20.map(p => p.high));
const latest = prices[prices.length - 1];

console.log(`Last 20 bars high: ${last20High}`);
console.log(`Today's close: ${latest.close}`);
console.log(`Close > 20-day high? ${latest.close > last20High}`);
console.log();

const config = { system: 'system1', useTrendFilter: false, riskPerTrade: 2, stopLossMultiplier: 2.0 };
const result = generateSignalV2('TEST', prices, config);

console.log('SIGNAL RESULT:');
console.log(`System 1 Buy: ${result.system1.buySignal}`);
console.log(`Reason: ${result.system1.reason || 'N/A'}`);
if (result.system1.buySignal) {
  console.log(`Entry: ${result.system1.entryPrice}, Stop: ${result.system1.stopLoss}`);
}
