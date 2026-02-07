#!/usr/bin/env node
import { generateSignalV2 } from './dist/backend/src/engine/signals.js';

const prices = [];

// 200 days at price 100
for (let i = 0; i < 200; i++) {
  prices.push({
    date: `2024-07-${String(i+1).padStart(2,'0')}`,
    open: 100, high: 100.5, low: 99.5, close: 100, volume: 1e6
  });
}

// Days 200-219: max high is 103.5
for (let i = 0; i < 20; i++) {
  prices.push({
    date: `2024-09-${String(i+1).padStart(2,'0')}`,
    open: 102, high: 103.5, low: 101, close: 102.5, volume: 1e6
  });
}

// Day 220: close at 104 (above 103.5!)
prices.push({
  date: '2024-09-21',
  open: 103.5, high: 104, low: 103, close: 104, volume: 1e6
});

const last20High = Math.max(...prices.slice(-20).map(p => p.high));
console.log(`Last 20 days max high: ${last20High}`);
console.log(`Today close: ${prices[prices.length - 1].close}`);
console.log(`Close > 20-day high? ${prices[prices.length - 1].close > last20High}`);
console.log();

const config = { system: 'system1', useTrendFilter: false, riskPerTrade: 2, stopLossMultiplier: 2.0 };
const result = generateSignalV2('TEST', prices, config);

if (result.system1.buySignal) {
  console.log('✓✓✓ BUY SIGNAL TRIGGERED ✓✓✓');
  console.log(`Entry Price: $${result.system1.entryPrice}`);
  console.log(`Stop Loss: $${result.system1.stopLoss}`);
  console.log(`Risk: $${Math.abs(result.system1.stopLoss - result.system1.entryPrice).toFixed(2)}`);
  console.log(`Reason: ${result.system1.reason}`);
} else {
  console.log('✗ No signal');
  console.log(`Reason: ${result.system1.reason || 'No breakout detected'}`);
}
