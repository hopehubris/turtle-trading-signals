#!/usr/bin/env node

/**
 * Test script: Run Turtle Trading signals with different configurations
 * Downloads Russell 2000 data and tests all 4 config combinations
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Import the signal engine
const { generateSignalV2, analyzeTrend } = require('./dist/backend/src/engine/signals.js');

/**
 * Fetch Russell 2000 data from Yahoo Finance API
 */
async function fetchRussell2000Data(days = 250) {
  return new Promise((resolve, reject) => {
    // Using a sample ticker (we'll fetch IWM which tracks Russell 2000)
    const url = `https://query1.finance.yahoo.com/v7/finance/download/IWM?interval=1d&range=${days}d`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.split('\n');
          const prices = [];
          
          // Skip header
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const [date, open, high, low, close, adjClose, volume] = line.split(',');
            prices.push({
              date,
              open: parseFloat(open),
              high: parseFloat(high),
              low: parseFloat(low),
              close: parseFloat(close),
              volume: parseInt(volume),
            });
          }
          
          // Reverse to chronological order (oldest first)
          prices.reverse();
          resolve(prices);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Run test scans with different configurations
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('TURTLE TRADING SIGNALS - CONFIGURATION TEST');
  console.log('='.repeat(80));
  console.log();

  try {
    // Fetch Russell 2000 data (IWM ETF)
    console.log('📊 Fetching Russell 2000 data (IWM ETF)...');
    const priceData = await fetchRussell2000Data(250);
    console.log(`✓ Downloaded ${priceData.length} days of data\n`);

    // Show current market conditions
    const latestPrice = priceData[priceData.length - 1];
    const trendAnalysis = analyzeTrend(priceData);
    console.log(`📈 Market Conditions:`);
    console.log(`   Current Price: $${latestPrice.close.toFixed(2)}`);
    console.log(`   200-day MA: $${trendAnalysis.ma200.toFixed(2)}`);
    console.log(`   Trend: ${trendAnalysis.context.toUpperCase()}`);
    console.log(`   Strength: ${(trendAnalysis.strength * 100).toFixed(1)}%`);
    console.log();

    // Test configurations
    const configs = [
      {
        name: 'System 1 + Trend Filter ON',
        system: 'system1',
        useTrendFilter: true,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 1 + Trend Filter OFF',
        system: 'system1',
        useTrendFilter: false,
        stopLossMultiplier: 2.0,
      },
      {
        name: 'System 2 + Trend Filter ON',
        system: 'system2',
        useTrendFilter: true,
        stopLossMultiplier: 1.5,
      },
      {
        name: 'System 2 + Trend Filter OFF',
        system: 'system2',
        useTrendFilter: false,
        stopLossMultiplier: 1.5,
      },
    ];

    const results = [];

    for (const config of configs) {
      console.log(`🔍 Testing: ${config.name}`);
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
          console.log(`   Reason: ${systemSignal.reason}`);
        } else if (systemSignal.trendFiltered) {
          console.log(`   ⚠️  FILTERED BY TREND`);
          console.log(`   Reason: ${systemSignal.reason}`);
        } else {
          console.log(`   No signal at current price`);
        }

        results.push({
          config: config.name,
          signal: signalType,
          hasSignal,
          trendFiltered: systemSignal.trendFiltered,
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
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const signalCounts = {
      'System 1 + Filter ON': results[0].signal,
      'System 1 + Filter OFF': results[1].signal,
      'System 2 + Filter ON': results[2].signal,
      'System 2 + Filter OFF': results[3].signal,
    };

    console.log('Signal Generation Comparison:');
    Object.entries(signalCounts).forEach(([name, signal]) => {
      const marker = signal === 'NONE' ? '○' : signal === 'BUY' ? '△' : signal === 'SELL' ? '▽' : '✗';
      console.log(`  ${marker} ${name}: ${signal}`);
    });

    console.log();
    console.log('Key Insights:');
    const system1Diff = results[1].signal !== 'NONE' && results[0].signal === 'NONE';
    const system2Diff = results[3].signal !== 'NONE' && results[2].signal === 'NONE';
    
    if (system1Diff || system2Diff) {
      console.log('  • Trend filter removed potential counter-trend trades');
    }
    if (results[2].signal === 'NONE' && results[0].signal !== 'NONE') {
      console.log('  • System 1 is more aggressive (catches earlier)');
    }
    if (results[2].signal !== 'NONE' && results[0].signal === 'NONE') {
      console.log('  • System 2 is more conservative (waits for confirmation)');
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests().then(() => {
  console.log();
  console.log('✓ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
