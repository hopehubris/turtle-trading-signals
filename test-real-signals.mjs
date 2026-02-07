#!/usr/bin/env node

/**
 * Test script: Generate data with current price ABOVE breakout levels
 */

import { generateSignalV2, analyzeTrend } from './dist/backend/src/engine/signals.js';

/**
 * Generate data where we're IN an active breakout
 */
function generateActiveBreakoutData() {
  const prices = [];
  const startDate = new Date(2024, 6, 1);

  // Days 0-200: Consolidation to establish 200-day MA
  for (let i = 0; i < 200; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const noise = (Math.random() - 0.5) * 8;
    const price = 2100 + noise;

    prices.push({
      date: dateStr,
      open: price,
      high: price + 4,
      low: price - 4,
      close: price + (Math.random() - 0.5) * 2,
      volume: 300000000,
    });
  }

  // Days 200-215: Slow consolidation (establish lower 20-day high)
  for (let i = 200; i < 215; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const price = 2100 + (i - 200) * 0.3;
    prices.push({
      date: dateStr,
      open: price,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 300000000,
    });
  }

  // Days 215-240: STRONG UPTREND (breakout well above 20-day high)
  for (let i = 215; i <= 240; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const price = 2105 + (i - 215) * 1.5; // Strong uptrend
    prices.push({
      date: dateStr,
      open: price,
      high: price + 3,
      low: price - 1,
      close: price + (Math.random() - 0.5) * 1.5,
      volume: 400000000,
    });
  }

  // Days 241-250: Continue ABOVE breakout, current price well above 20-day high
  for (let i = 241; i <= 250; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const price = 2141 + (Math.random() - 0.5) * 4; // Well above breakout
    prices.push({
      date: dateStr,
      open: price,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 350000000,
    });
  }

  return prices;
}

/**
 * Run test
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('TURTLE TRADING SIGNALS v2 - ACTIVE BREAKOUT TEST');
  console.log('Testing with real signal conditions');
  console.log('='.repeat(80));
  console.log();

  try {
    console.log('📊 Generating data: Price is ABOVE both 20-day and 55-day highs...');
    const priceData = generateActiveBreakoutData();
    console.log(`✓ Generated ${priceData.length} days of data\n`);

    const latestPrice = priceData[priceData.length - 1];
    const trendAnalysis = analyzeTrend(priceData);

    console.log(`Current Market State:`);
    console.log(`  Price: $${latestPrice.close.toFixed(2)} (${latestPrice.date})`);
    console.log(`  200-day MA: $${trendAnalysis.ma200.toFixed(2)}`);
    console.log(`  Trend: ${trendAnalysis.isAboveMA200 ? 'UPTREND ✓' : 'DOWNTREND ✗'}`);
    console.log();

    // Calculate levels
    const last20High = Math.max(...priceData.slice(-20).map(p => p.high));
    const last20Low = Math.min(...priceData.slice(-20).map(p => p.low));
    const last55High = Math.max(...priceData.slice(-55).map(p => p.high));
    const last55Low = Math.min(...priceData.slice(-55).map(p => p.low));
    const last10Low = Math.min(...priceData.slice(-10).map(p => p.low));

    console.log(`Donchian Levels:`);
    console.log(`  20-day: High=$${last20High.toFixed(2)}, Low=$${last20Low.toFixed(2)}`);
    console.log(`  55-day: High=$${last55High.toFixed(2)}, Low=$${last55Low.toFixed(2)}`);
    console.log(`  10-day Low: $${last10Low.toFixed(2)}`);
    console.log();

    if (latestPrice.close > last20High) {
      console.log(`⚠️  Current price ($${latestPrice.close.toFixed(2)}) IS ABOVE 20-day high - signals should trigger!`);
    }
    console.log();

    // Test
    console.log('TEST EXECUTION');
    console.log('='.repeat(80));
    console.log();

    const configs = [
      {
        name: 'System 1 + Filter ON',
        system: 'system1',
        useTrendFilter: true,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 1 + Filter OFF',
        system: 'system1',
        useTrendFilter: false,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 2 + Filter ON',
        system: 'system2',
        useTrendFilter: true,
        stopLossMultiplier: 1.5,
      },
      {
        name: 'System 2 + Filter OFF',
        system: 'system2',
        useTrendFilter: false,
        stopLossMultiplier: 1.5,
      },
    ];

    for (const config of configs) {
      console.log(`Testing: ${config.name}`);
      try {
        const signalCalc = generateSignalV2('TEST', priceData, config);
        const systemSignal = config.system === 'system1'
          ? signalCalc.system1
          : signalCalc.system2;

        const hasSignal = systemSignal.buySignal || systemSignal.sellSignal;
        const signalType = systemSignal.buySignal ? 'BUY ✓' : systemSignal.sellSignal ? 'SELL' : 'NONE';

        console.log(`  Signal: ${signalType}`);
        
        if (hasSignal) {
          console.log(`  Entry: $${systemSignal.entryPrice?.toFixed(2)}`);
          console.log(`  Stop: $${systemSignal.stopLoss?.toFixed(2)}`);
          const atr = signalCalc.indicators.atr14;
          console.log(`  ATR-14: $${atr.toFixed(2)}`);
          console.log(`  ✓ SIGNAL GENERATED`);
        } else if (systemSignal.trendFiltered) {
          console.log(`  Status: FILTERED (trend context)`);
        } else {
          console.log(`  Status: No signal`);
        }
        console.log();
      } catch (error) {
        console.log(`  ❌ ${error.message}\n`);
      }
    }

    console.log('='.repeat(80));
    console.log('✓ Test complete');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runTests();
