<template>
  <div class="analytics-page">
    <h1>Analytics</h1>

    <div v-if="metrics" class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Trades</div>
        <div class="metric-value">{{ metrics.totalTrades }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Win Rate</div>
        <div class="metric-value">{{ metrics.winRate.toFixed(1) }}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total P&L</div>
        <div class="metric-value" :class="{ gain: metrics.totalPnL > 0, loss: metrics.totalPnL < 0 }">
          ${{ metrics.totalPnL.toFixed(2) }}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg P&L %</div>
        <div class="metric-value" :class="{ gain: metrics.averagePnLPercent > 0, loss: metrics.averagePnLPercent < 0 }">
          {{ metrics.averagePnLPercent.toFixed(2) }}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Profit Factor</div>
        <div class="metric-value">{{ metrics.profitFactor ? metrics.profitFactor.toFixed(2) : 'N/A' }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Best Trade</div>
        <div class="metric-value gain">${{ metrics.largestWin.toFixed(2) }}</div>
      </div>
    </div>

    <div v-else class="loading">Loading metrics...</div>

    <button @click="refreshMetrics" class="btn btn-primary">Refresh</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

const metrics = ref<any>(null)

const refreshMetrics = async () => {
  try {
    const res = await axios.get('/api/analytics/performance')
    metrics.value = res.data.data
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
  }
}

onMounted(() => {
  refreshMetrics()
})
</script>

<style scoped>
.analytics-page {
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.metric-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.metric-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #2c3e50;
}

.metric-value.gain {
  color: #27ae60;
}

.metric-value.loss {
  color: #e74c3c;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #3498db;
  color: white;
  transition: background 0.3s;
}

.btn:hover {
  background: #2980b9;
}
</style>
