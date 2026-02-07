#!/usr/bin/env node

/**
 * Test script: Run Turtle Trading signals with different configurations
 * Uses generated synthetic data matching Russell 2000 behavior
 */

import { generateSignalV2, analyzeTrend } from './dist/backend/src/engine/signals.js';

/**
 * Generate synthetic Russell 2000 data
 * Creates realistic market conditions with trend and volatility
 */
function generateSyntheticData(days = 250, trend = 'mixed') {
  const prices = [];
  let basePrice = 2050; // Approximate Russell 2000 level
  let volatility = 0.01; // 1% daily volatility

  for (let i = 0; i < days; i++) {
    const date = new Date(2024, 6, 1 + i); // Start July 2024
    const dateStr = date.toISOString().split('T')[0];

    // Apply trend
    let trendFactor = 0;
    if (trend === 'up') {
      trendFactor = 0.001; // Slight uptrend
    } else if (trend === 'down') {
      trendFactor = -0.001; // Slight downtrend
    } else {
      // Mixed: up for first 150 days, then down
      trendFactor = i < 150 ? 0.0005 : -0.0005;
    }

    // Random walk with trend
    const change = (Math.random() - 0.5) * volatility + trendFactor;
    basePrice *= (1 + change);

    const open = basePrice;
    const close = basePrice * (1 + (Math.random() - 0.5) * 0.005);
    const high = Math.max(open, close) * (1 + Math.abs(Math.random() * 0.01));
    const low = Math.min(open, close) * (1 - Math.abs(Math.random() * 0.01));
    const volume = Math.floor(Math.random() * 500000000) + 300000000;

    prices.push({
      date: dateStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
  }

  return prices;
}

/**
 * Run test scans with different configurations
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('TURTLE TRADING SIGNALS v2 - CONFIGURATION TEST');
  console.log('='.repeat(80));
  console.log();

  try {
    // Generate synthetic Russell 2000 data
    console.log('📊 Generating Russell 2000 synthetic data (mixed trend)...');
    const priceData = generateSyntheticData(250, 'mixed');
    console.log(`✓ Generated ${priceData.length} days of data\n`);

    // Show current market conditions
    const latestPrice = priceData[priceData.length - 1];
    const trendAnalysis = analyzeTrend(priceData);
    console.log(`📈 Market Conditions:`);
    console.log(`   Date: ${latestPrice.date}`);
    console.log(`   Current Price: $${latestPrice.close.toFixed(2)}`);
    console.log(`   200-day MA: $${trendAnalysis.ma200.toFixed(2)}`);
    console.log(`   Trend: ${trendAnalysis.context.toUpperCase()}`);
    console.log(`   Distance from MA: ${trendAnalysis.isAboveMA200 ? '+' : '-'}${(trendAnalysis.strength * 100).toFixed(1)}%`);
    console.log();

    // Test configurations
    const configs = [
      {
        name: 'System 1 (20-day breakout) + Trend Filter ON',
        system: 'system1',
        useTrendFilter: true,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 1 (20-day breakout) + Trend Filter OFF',
        system: 'system1',
        useTrendFilter: false,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 2 (55-day breakout) + Trend Filter ON',
        system: 'system2',
        useTrendFilter: true,
        stopLossMultiplier: 1.5,
      },
      {
        name: 'System 2 (55-day breakout) + Trend Filter OFF',
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
        const signalCalc = generateSignalV2('IWM', priceData, config);
        const systemSignal = config.system === 'system1' 
          ? signalCalc.system1 
          : signalCalc.system2;

        const hasSignal = systemSignal.buySignal || systemSignal.sellSignal;
        const signalType = systemSignal.buySignal ? 'BUY' : systemSignal.sellSignal ? 'SELL' : 'NONE';

        console.log(`   Signal Type: ${signalType}`);
        
        if (hasSignal) {
          console.log(`   Entry Price: $${systemSignal.entryPrice?.toFixed(2)}`);
          console.log(`   Stop Loss: $${systemSignal.stopLoss?.toFixed(2)}`);
          console.log(`   Risk: ${Math.abs(systemSignal.stopLoss - systemSignal.entryPrice).toFixed(2)} points`);
          console.log(`   Reason: ${systemSignal.reason}`);
        } else if (systemSignal.trendFiltered) {
          console.log(`   ⚠️  SIGNAL FILTERED (Trend Context)`);
          console.log(`   Reason: ${systemSignal.reason}`);
        } else {
          console.log(`   ⊘ No active signal at current price`);
        }

        results.push({
          config: config.name,
          system: config.system,
          signal: signalType,
          hasSignal,
          trendFiltered: systemSignal.trendFiltered,
          reason: systemSignal.reason,
        });

        console.log();
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          config: config.name,
          signal: 'ERROR',
          error: error.message,
        });
      }
    }

    // Summary
    console.log('='.repeat(80));
    console.log('ANALYSIS & INSIGHTS');
    console.log('='.repeat(80));
    console.log();

    // Comparison
    console.log('Signal Generation by Configuration:');
    console.log();
    const system1Results = results.slice(0, 2);
    const system2Results = results.slice(2, 4);

    console.log('SYSTEM 1 (20-day Breakout - More Aggressive)');
    console.log(`  With Trend Filter: ${system1Results[0].signal || 'NONE'} ${system1Results[0].trendFiltered ? '(filtered)' : ''}`);
    console.log(`  Without Filter:    ${system1Results[1].signal || 'NONE'}`);
    console.log();

    console.log('SYSTEM 2 (55-day Breakout - More Conservative)');
    console.log(`  With Trend Filter: ${system2Results[0].signal || 'NONE'} ${system2Results[0].trendFiltered ? '(filtered)' : ''}`);
    console.log(`  Without Filter:    ${system2Results[1].signal || 'NONE'}`);
    console.log();

    // Key differences
    console.log('Key Observations:');
    console.log();

    const s1OnDiff = system1Results[1].hasSignal && !system1Results[0].hasSignal;
    const s2OnDiff = system2Results[1].hasSignal && !system2Results[0].hasSignal;

    if (s1OnDiff || s2OnDiff) {
      console.log('✓ Trend Filter is Working:');
      console.log('  The 200-day MA filter prevented counter-trend trades.');
      console.log('  This is the primary benefit: avoiding breakouts against the major trend.');
      console.log();
    }

    if (system1Results[0].hasSignal && !system2Results[0].hasSignal) {
      console.log('✓ System 1 vs System 2 (with filter):');
      console.log('  System 1 (20-day) is MORE AGGRESSIVE - catches earlier entries');
      console.log('  System 2 (55-day) is MORE CONSERVATIVE - waits for confirmation');
      console.log();
    } else if (!system1Results[0].hasSignal && system2Results[0].hasSignal) {
      console.log('✓ System 1 vs System 2 (with filter):');
      console.log('  System 2 (55-day) generated a signal System 1 missed');
      console.log('  This suggests System 2 may catch later-stage confirmations');
      console.log();
    }

    // Market context
    if (trendAnalysis.isAboveMA200) {
      console.log('✓ Market Trend Context:');
      console.log('  Price is ABOVE 200-day MA (Uptrend)');
      console.log('  Long signals are preferred, short signals filtered');
      console.log();
    } else {
      console.log('✓ Market Trend Context:');
      console.log('  Price is BELOW 200-day MA (Downtrend)');
      console.log('  Short signals are preferred, long signals filtered');
      console.log();
    }

    console.log('Recommendation:');
    console.log('  Use SYSTEM 1 for faster entries (catch trends early)');
    console.log('  Use SYSTEM 2 for higher probability (wait for confirmation)');
    console.log('  ALWAYS use trend filter to avoid counter-trend trades');
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
