#!/usr/bin/env node

import { generateSignalV2, analyzeTrend } from './dist/backend/src/engine/signals.js';

// Simple data: price breaks above 20-day high on last day
function generateTestData() {
  const prices = [];
  
  // 200+ days of base price around 2100
  for (let i = 0; i < 200; i++) {
    const date = new Date(2024, 6, 1 + i);
    const dateStr = date.toISOString().split('T')[0];
    const price = 2100;
    prices.push({ date: dateStr, open: price, high: price+2, low: price-2, close: price, volume: 300000000 });
  }
  
  // Days 200-219: range-bound (establish 20-day high at 2110)
  for (let i = 200; i < 220; i++) {
    const date = new Date(2024, 6, 1 + i);
    const dateStr = date.toISOString().split('T')[0];
    const price = 2108 + Math.sin(i / 5) * 2; // oscillate 2106-2110
    prices.push({ date: dateStr, open: price, high: price+3, low: price-3, close: price, volume: 300000000 });
  }
  
  // Day 220: BREAKS ABOVE 20-day high (2110)
  const date220 = new Date(2024, 6, 1 + 220);
  prices.push({
    date: date220.toISOString().split('T')[0],
    open: 2115,
    high: 2118,
    low: 2114,
    close: 2116, // CLEARLY above 2110
    volume: 400000000
  });

  return prices;
}

const data = generateTestData();
console.log(`Generated ${data.length} days of data`);

const latestPrice = data[data.length - 1];
const last20High = Math.max(...data.slice(-20).map(p => p.high));

console.log(`Current Price: $${latestPrice.close}`);
console.log(`20-day High: $${last20High}`);
console.log(`Current > 20-day High? ${latestPrice.close > last20High}`);

try {
  const config = { system: 'system1', useTrendFilter: false, riskPerTrade: 2, stopLossMultiplier: 2.0 };
  const result = generateSignalV2('TEST', data, config);
  
  console.log(`\nSystem 1 Signal:`);
  console.log(`  Buy: ${result.system1.buySignal}`);
  console.log(`  Sell: ${result.system1.sellSignal}`);
  if (result.system1.buySignal) {
    console.log(`  Entry: $${result.system1.entryPrice}`);
    console.log(`  Stop: $${result.system1.stopLoss}`);
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}
