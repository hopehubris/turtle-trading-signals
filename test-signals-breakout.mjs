#!/usr/bin/env node

/**
 * Test script: Generate data with ACTUAL BREAKOUTS
 * This version creates data that will trigger signals
 */

import { generateSignalV2, analyzeTrend } from './dist/backend/src/engine/signals.js';

/**
 * Generate data specifically designed to trigger signals
 */
function generateBreakoutData() {
  const prices = [];
  let basePrice = 2100;
  const startDate = new Date(2024, 6, 1);

  // First 200 days: normal consolidation (builds MA)
  for (let i = 0; i < 200; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Oscillate around 2100
    const noise = (Math.random() - 0.5) * 10;
    const price = 2100 + noise;

    prices.push({
      date: dateStr,
      open: price,
      high: price + 5,
      low: price - 5,
      close: price + (Math.random() - 0.5) * 3,
      volume: 300000000,
    });
  }

  // Next 20 days: slow consolidation (sets 20-day high)
  const slowStart = 2090;
  for (let i = 200; i < 220; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const price = slowStart + (i - 200) * 0.5; // Slow rise
    prices.push({
      date: dateStr,
      open: price,
      high: price + 2,
      low: price - 2,
      close: price + (Math.random() - 0.5) * 1,
      volume: 300000000,
    });
  }

  // Day 220: BREAKOUT above 20-day high (System 1 triggers)
  const date220 = new Date(startDate);
  date220.setDate(date220.getDate() + 220);
  prices.push({
    date: date220.toISOString().split('T')[0],
    open: 2109,
    high: 2112,
    low: 2108,
    close: 2111.5, // Above 20-day high of ~2109.5
    volume: 400000000,
  });

  // Days 221-240: MORE breakout (System 2 triggers 55-day high)
  for (let i = 221; i <= 240; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const uptrend = 2111 + (i - 221) * 1.2; // Strong breakout
    prices.push({
      date: dateStr,
      open: uptrend,
      high: uptrend + 3,
      low: uptrend - 1,
      close: uptrend + (Math.random() - 0.5) * 2,
      volume: 400000000,
    });
  }

  // Last 10 days: consolidation above breakout
  for (let i = 241; i <= 250; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const price = 2120 + (Math.random() - 0.5) * 5;
    prices.push({
      date: dateStr,
      open: price,
      high: price + 3,
      low: price - 3,
      close: price,
      volume: 350000000,
    });
  }

  return prices;
}

/**
 * Run test with breakout data
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('TURTLE TRADING SIGNALS v2 - BREAKOUT TEST');
  console.log('='.repeat(80));
  console.log();

  try {
    // Generate data WITH a breakout
    console.log('📊 Generating data with built-in 20-day and 55-day breakouts...');
    const priceData = generateBreakoutData();
    console.log(`✓ Generated ${priceData.length} days of data\n`);

    // Show current market conditions
    const latestPrice = priceData[priceData.length - 1];
    const trendAnalysis = analyzeTrend(priceData);
    console.log(`📈 Market Conditions:`);
    console.log(`   Date: ${latestPrice.date}`);
    console.log(`   Current Price: $${latestPrice.close.toFixed(2)}`);
    console.log(`   200-day MA: $${trendAnalysis.ma200.toFixed(2)}`);
    console.log(`   Trend: ${trendAnalysis.context.toUpperCase()}`);
    console.log(`   Status: ${trendAnalysis.isAboveMA200 ? 'UPTREND ✓' : 'DOWNTREND ✗'}`);
    console.log();

    // Show historical context
    const last20High = Math.max(...priceData.slice(-20).map(p => p.high));
    const last55High = Math.max(...priceData.slice(-55).map(p => p.high));
    console.log(`📊 Historical Levels:`);
    console.log(`   20-day High: $${last20High.toFixed(2)} (System 1 breakout threshold)`);
    console.log(`   55-day High: $${last55High.toFixed(2)} (System 2 breakout threshold)`);
    console.log();

    // Test configurations
    const configs = [
      {
        name: 'System 1 (20-day) + Trend Filter ON',
        system: 'system1',
        useTrendFilter: true,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 1 (20-day) + Trend Filter OFF',
        system: 'system1',
        useTrendFilter: false,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 2 (55-day) + Trend Filter ON',
        system: 'system2',
        useTrendFilter: true,
        stopLossMultiplier: 1.5,
      },
      {
        name: 'System 2 (55-day) + Trend Filter OFF',
        system: 'system2',
        useTrendFilter: false,
        stopLossMultiplier: 1.5,
      },
    ];

    const results = [];

    console.log('RUNNING TESTS');
    console.log('='.repeat(80));
    console.log();

    for (const config of configs) {
      console.log(`🔍 ${config.name}`);
      console.log('-'.repeat(60));

      try {
        const signalCalc = generateSignalV2('TEST', priceData, config);
        const systemSignal = config.system === 'system1' 
          ? signalCalc.system1 
          : signalCalc.system2;

        const hasSignal = systemSignal.buySignal || systemSignal.sellSignal;
        const signalType = systemSignal.buySignal ? 'BUY ▲' : systemSignal.sellSignal ? 'SELL ▼' : 'NONE';

        console.log(`   Result: ${signalType}`);
        
        if (hasSignal) {
          const atr = signalCalc.indicators.atr14;
          const riskPoints = config.stopLossMultiplier * atr;
          console.log(`   Entry:  $${systemSignal.entryPrice?.toFixed(2)}`);
          console.log(`   Stop:   $${systemSignal.stopLoss?.toFixed(2)} (${config.stopLossMultiplier}x ATR = ${riskPoints.toFixed(2)} points)`);
          console.log(`   Reason: ${systemSignal.reason}`);
        } else if (systemSignal.trendFiltered) {
          console.log(`   Status: FILTERED ⚠️`);
          console.log(`   Reason: ${systemSignal.reason}`);
        } else {
          console.log(`   Status: No signal`);
        }

        results.push({
          name: config.name,
          system: config.system,
          signal: signalType,
          hasSignal,
          trendFiltered: systemSignal.trendFiltered,
        });

        console.log();
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Summary
    console.log('='.repeat(80));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const signalSummary = results.map(r => `${r.name}: ${r.signal}`);
    console.log(signalSummary.join('\n'));
    console.log();

    // Analysis
    console.log('KEY FINDINGS:');
    console.log();
    console.log('1. TREND FILTER EFFECT:');
    if (results[1].hasSignal && !results[0].hasSignal) {
      console.log('   ✗ The filter removed the System 1 signal (counter-trend)');
    } else if (results[1].hasSignal && results[0].hasSignal) {
      console.log('   ✓ The filter allowed System 1 signal (aligned with trend)');
    }
    console.log();

    console.log('2. SYSTEM COMPARISON:');
    if (results[0].hasSignal && !results[2].hasSignal) {
      console.log('   System 1 caught the signal, System 2 did not');
      console.log('   System 1 is MORE AGGRESSIVE (earlier detection)');
    } else if (!results[0].hasSignal && results[2].hasSignal) {
      console.log('   System 2 caught the signal, System 1 did not');
      console.log('   System 2 is MORE CONSERVATIVE (later confirmation)');
    } else if (results[0].hasSignal && results[2].hasSignal) {
      console.log('   Both systems caught the signal!');
      console.log('   Indicates strong, confirmed breakout');
    }
    console.log();

    console.log('3. RECOMMENDATIONS:');
    console.log('   • Always use trend filter with both systems');
    console.log('   • Choose System 1 for speed, System 2 for confirmation');
    console.log('   • The 200-day MA is essential for avoiding false signals');
    console.log();

  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests().then(() => {
  console.log('✓ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
