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

// Days 200-219: establish 20-day high at 105
for (let i = 200; i < 220; i++) {
  const date = new Date(2024, 6, 1 + i);
  prices.push({
    date: date.toISOString().split('T')[0],
    open: 104, high: 105, low: 103, close: 104, volume: 1000000
  });
}

// Day 220: CLOSE ABOVE 20-day high (105)
const date220 = new Date(2024, 6, 1 + 220);
prices.push({
  date: date220.toISOString().split('T')[0],
  open: 105.5,
  high: 106,
  low: 105,
  close: 105.5, // ABOVE 105!
  volume: 1000000
});

console.log(`Data points: ${prices.length}`);
const latestPrice = prices[prices.length - 1];
const last20High = Math.max(...prices.slice(-20).map(p => p.high));
console.log(`Latest close: ${latestPrice.close}`);
console.log(`20-day high: ${last20High}`);
console.log(`Signal should trigger? ${latestPrice.close > last20High}`);
console.log();

const config = { system: 'system1', useTrendFilter: false, riskPerTrade: 2, stopLossMultiplier: 2.0 };
const result = generateSignalV2('TEST', prices, config);

console.log('Signal Result:');
console.log(`  Buy Signal: ${result.system1.buySignal}`);
console.log(`  Reason: ${result.system1.reason}`);
if (result.system1.buySignal) {
  console.log(`  Entry Price: ${result.system1.entryPrice}`);
  console.log(`  Stop Loss: ${result.system1.stopLoss}`);
}
