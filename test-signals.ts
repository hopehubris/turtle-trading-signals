import { generateSignalV2, analyzeTrend } from './backend/src/engine/signals.js';
import { OHLC } from './backend/src/types/index.js';
import { ScanConfig } from './backend/src/engine/types.js';
import * as fs from 'fs';

/**
 * Fetch historical data from Yahoo Finance via free API
 */
async function fetchHistoricalData(ticker: string): Promise<OHLC[]> {
  try {
    // Using a free data endpoint - trying multiple sources
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics`;
    
    // Try yfinance-like endpoint
    const pythonUrl = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=1609459200&period2=${Math.floor(Date.now() / 1000)}&interval=1d&events=history`;
    
    console.log(`Fetching data for ${ticker} from Yahoo Finance...`);
    
    const response = await fetch(pythonUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const lines = text.split('\n').slice(1).filter(line => line.trim());
    
    const data: OHLC[] = [];
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 6) continue;
      
      const date = parts[0];
      const open = parseFloat(parts[1]);
      const high = parseFloat(parts[2]);
      const low = parseFloat(parts[3]);
      const close = parseFloat(parts[4]);
      const volume = parseInt(parts[5], 10);
      
      if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && !isNaN(volume)) {
        data.push({ date, open, high, low, close, volume });
      }
    }
    
    // Keep only last 250 days
    return data.slice(-250);
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Generate synthetic data with clear breakouts for testing
 */
function generateSyntheticData(ticker: string, includeBreakout: boolean = true): OHLC[] {
  const data: OHLC[] = [];
  let price = 100;
  
  // First 200 days: establish base range with trend
  for (let i = 0; i < 200; i++) {
    const change = (Math.random() - 0.5) * 2 + 0.1; // slight uptrend
    price = Math.max(10, price + change);
    
    const date = new Date(2024, 6, 1 + i); // Start in July 2024
    const dateStr = date.toISOString().split('T')[0];
    
    const open = price;
    const close = price + (Math.random() - 0.5) * 1;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.floor(Math.random() * 5000000) + 1000000;
    
    data.push({ date: dateStr, open, high, low, close, volume });
  }
  
  // Last 50 days: create breakout
  let basePrice = price;
  for (let i = 200; i < 250; i++) {
    const date = new Date(2024, 6, 1 + i);
    const dateStr = date.toISOString().split('T')[0];
    
    let close: number;
    
    if (includeBreakout && i >= 230) {
      // Last 20 bars: breakout above 20-day high
      close = basePrice + (i - 230) * 1.5; // Strong uptrend
    } else {
      // Consolidation
      const change = (Math.random() - 0.5) * 2;
      basePrice = Math.max(10, basePrice + change);
      close = basePrice;
    }
    
    const open = close + (Math.random() - 0.5) * 0.5;
    const high = Math.max(open, close) + Math.random() * 1;
    const low = Math.min(open, close) - Math.random() * 1;
    const volume = Math.floor(Math.random() * 5000000) + 1000000;
    
    data.push({ date: dateStr, open, high, low, close, volume });
  }
  
  return data;
}

/**
 * Test signal engine with different configurations
 */
async function testSignalEngine() {
  console.log('🚀 Testing Turtle Trading Signal Engine v2\n');
  console.log('=' .repeat(80));
  
  // Russell 2000 sample tickers - mix with and without breakouts
  const testCases = [
    { ticker: 'BREAKOUT1', hasBreakout: true },
    { ticker: 'BREAKOUT2', hasBreakout: true },
    { ticker: 'NOBREAK1', hasBreakout: false },
    { ticker: 'NOBREAK2', hasBreakout: false },
  ];
  const configs: ScanConfig[] = [
    { system: 'system1', useTrendFilter: true, riskPerTrade: 2, stopLossMultiplier: 2.0 },
    { system: 'system1', useTrendFilter: false, riskPerTrade: 2, stopLossMultiplier: 2.0 },
    { system: 'system2', useTrendFilter: true, riskPerTrade: 2, stopLossMultiplier: 1.5 },
    { system: 'system2', useTrendFilter: false, riskPerTrade: 2, stopLossMultiplier: 1.5 },
  ];
  
  const results: any[] = [];
  
  for (const testCase of testCases) {
    const ticker = testCase.ticker;
    console.log(`\n📊 Testing ${ticker}${testCase.hasBreakout ? ' (WITH breakout)' : ' (no breakout)'}...`);
    
    // Use synthetic data (real data fetch not reliable)
    let priceData = generateSyntheticData(ticker, testCase.hasBreakout);
    
    console.log(`  ✓ Data: ${priceData.length} bars | Price: ${priceData[priceData.length - 1].close.toFixed(2)}`);
    
    // Analyze trend
    const trend = analyzeTrend(priceData);
    console.log(`  📈 Trend: ${trend.context.toUpperCase()} | MA200: ${trend.ma200.toFixed(2)} | Above MA: ${trend.isAboveMA200 ? 'YES' : 'NO'}`);
    
    // Test each configuration
    for (const config of configs) {
      try {
        const signal = generateSignalV2(ticker, priceData, config);
        const systemSignal = config.system === 'system1' ? signal.system1 : signal.system2;
        
        let signalInfo = `${config.system}${config.useTrendFilter ? ' +TF' : ''}: `;
        
        if (systemSignal.buySignal) {
          signalInfo += `BUY @ ${systemSignal.entryPrice?.toFixed(2)} | SL: ${systemSignal.stopLoss?.toFixed(2)}`;
          results.push({
            ticker,
            system: config.system,
            trendFilter: config.useTrendFilter,
            signalType: 'buy',
            entry: systemSignal.entryPrice,
            stopLoss: systemSignal.stopLoss,
            reason: systemSignal.reason,
          });
        } else if (systemSignal.sellSignal) {
          signalInfo += `SELL @ ${systemSignal.entryPrice?.toFixed(2)} | SL: ${systemSignal.stopLoss?.toFixed(2)}`;
          results.push({
            ticker,
            system: config.system,
            trendFilter: config.useTrendFilter,
            signalType: 'sell',
            entry: systemSignal.entryPrice,
            stopLoss: systemSignal.stopLoss,
            reason: systemSignal.reason,
          });
        } else if (systemSignal.trendFiltered) {
          signalInfo += `⛔ FILTERED (trend)`;
        } else {
          signalInfo += `⏸️  NO SIGNAL`;
        }
        
        console.log(`    ${signalInfo}`);
      } catch (error) {
        console.error(`    Error: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 SUMMARY\n');
  
  // Count signals by configuration
  const summary: Record<string, any> = {};
  for (const config of configs) {
    const key = `${config.system}${config.useTrendFilter ? '+TF' : ''}`;
    const configResults = results.filter(r => r.system === config.system && r.trendFilter === config.useTrendFilter);
    summary[key] = {
      total: configResults.length,
      buy: configResults.filter(r => r.signalType === 'buy').length,
      sell: configResults.filter(r => r.signalType === 'sell').length,
    };
    console.log(`${key}: ${configResults.length} signals (${summary[key].buy} buy, ${summary[key].sell} sell)`);
  }
  
  if (results.length > 0) {
    console.log('\n🎯 Sample Signals:\n');
    for (const result of results.slice(0, 5)) {
      console.log(`${result.ticker}: ${result.signalType.toUpperCase()} @ ${result.entry.toFixed(2)}`);
      console.log(`  Stop Loss: ${result.stopLoss.toFixed(2)}`);
      console.log(`  Reason: ${result.reason}`);
      console.log('');
    }
  }
}

// Run tests
testSignalEngine().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
