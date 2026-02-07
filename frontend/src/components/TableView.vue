<template>
  <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th>Ticker</th>
          <th class="number">Price</th>
          <th class="number" :class="{ highlight: highlightColumn === 'changePercent' }">Change %</th>
          <th class="number">52W High</th>
          <th class="number">52W Low</th>
          <th class="number" :class="{ highlight: highlightColumn === 'percentFromHigh' }">% from High</th>
          <th class="number" :class="{ highlight: highlightColumn === 'percentFromLow' }">% from Low</th>
          <th class="number">EMA 20</th>
          <th class="number">EMA 50</th>
          <th class="number">EMA 200</th>
          <th class="number" :class="{ highlight: highlightColumn === 'priceVsEma200' }">% vs EMA200</th>
          <th class="number" :class="{ highlight: highlightColumn === 'rsi14' }">RSI 14</th>
          <th class="number">ATR 14</th>
          <th class="number" :class="{ highlight: highlightColumn === 'volatility' }">Vol %</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data" :key="item.ticker" class="data-row">
          <td class="ticker">{{ item.ticker }}</td>
          <td class="number">${{ item.price.toFixed(2) }}</td>
          <td class="number" :class="getChangeClass(item.changePercent)">
            {{ item.changePercent >= 0 ? '+' : '' }}{{ item.changePercent.toFixed(2) }}%
          </td>
          <td class="number">${{ item.high52w.toFixed(2) }}</td>
          <td class="number">${{ item.low52w.toFixed(2) }}</td>
          <td class="number" :class="getChangeClass(item.percentFromHigh)">
            {{ item.percentFromHigh.toFixed(2) }}%
          </td>
          <td class="number" :class="getChangeClass(item.percentFromLow)">
            {{ item.percentFromLow.toFixed(2) }}%
          </td>
          <td class="number">${{ item.ema20.toFixed(2) }}</td>
          <td class="number">${{ item.ema50.toFixed(2) }}</td>
          <td class="number">${{ item.ema200.toFixed(2) }}</td>
          <td class="number" :class="getChangeClass(item.priceVsEma200)">
            {{ item.priceVsEma200 >= 0 ? '+' : '' }}{{ item.priceVsEma200.toFixed(2) }}%
          </td>
          <td class="number" :class="getRSIClass(item.rsi14)">
            {{ item.rsi14.toFixed(1) }}
          </td>
          <td class="number">${{ item.atr14.toFixed(2) }}</td>
          <td class="number">{{ item.volatility.toFixed(2) }}%</td>
        </tr>
      </tbody>
    </table>
    <p v-if="data.length === 0" class="empty-message">No data to display</p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  data: {
    type: Array,
    required: true,
  },
  highlightColumn: {
    type: String,
    default: null,
  },
})

const getChangeClass = (value: number) => {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

const getRSIClass = (value: number) => {
  if (value >= 70) return 'overbought'
  if (value <= 30) return 'oversold'
  return 'neutral'
}
</script>

<style scoped>
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

thead {
  background: #ecf0f1;
  position: sticky;
  top: 0;
}

th {
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #34495e;
  white-space: nowrap;
  border-bottom: 2px solid #bdc3c7;
}

th.number {
  text-align: right;
}

th.highlight {
  background: #fff3cd;
  color: #856404;
}

.data-row {
  border-bottom: 1px solid #ecf0f1;
  transition: background 0.2s;
}

.data-row:hover {
  background: #f8f9fa;
}

td {
  padding: 0.75rem;
  text-align: left;
}

td.ticker {
  font-weight: bold;
  color: #2c3e50;
  min-width: 80px;
}

td.number {
  text-align: right;
  font-family: 'Monaco', 'Courier New', monospace;
  white-space: nowrap;
}

td.positive {
  color: #27ae60;
  font-weight: 500;
}

td.negative {
  color: #e74c3c;
  font-weight: 500;
}

td.neutral {
  color: #34495e;
}

td.overbought {
  background: #fadbd8;
  color: #c0392b;
  font-weight: 500;
}

td.oversold {
  background: #d5f4e6;
  color: #27ae60;
  font-weight: 500;
}

.empty-message {
  padding: 2rem;
  text-align: center;
  color: #7f8c8d;
}
</style>
