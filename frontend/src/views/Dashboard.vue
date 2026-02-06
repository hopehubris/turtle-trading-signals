<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <div class="status-section">
      <div class="status-card">
        <div class="status-label">Status</div>
        <div class="status-value">{{ health?.status || 'Loading...' }}</div>
      </div>
      <div class="status-card">
        <div class="status-label">Last Scan</div>
        <div class="status-value">{{ formatDate(health?.lastScan?.created_at) }}</div>
      </div>
      <div class="status-card">
        <div class="status-label">Signals Today</div>
        <div class="status-value">{{ todaySignals.length }}</div>
      </div>
      <div class="status-card">
        <div class="status-label">Buy / Sell</div>
        <div class="status-value">{{ buyCount }} / {{ sellCount }}</div>
      </div>
    </div>

    <div class="signals-section">
      <h2>Today's Signals</h2>
      <div class="controls">
        <button @click="refreshData" class="btn btn-primary">Refresh</button>
        <input 
          v-model="filterTicker" 
          type="text" 
          placeholder="Filter by ticker"
          @input="filterData"
          class="search-input"
        />
      </div>

      <div v-if="filteredSignals.length === 0" class="empty-state">
        No signals generated
      </div>

      <div v-else class="signals-table">
        <div class="table-header">
          <div class="col-ticker">Ticker</div>
          <div class="col-type">Signal</div>
          <div class="col-price">Entry Price</div>
          <div class="col-stop">Stop Loss</div>
          <div class="col-time">Time</div>
        </div>

        <div v-for="signal in filteredSignals" :key="signal.id" class="table-row">
          <div class="col-ticker">{{ signal.ticker }}</div>
          <div class="col-type">
            <span :class="`badge badge-${signal.signal_type}`">
              {{ signal.signal_type.toUpperCase() }}
            </span>
          </div>
          <div class="col-price">${{ signal.entry_price.toFixed(2) }}</div>
          <div class="col-stop">${{ signal.stop_loss_price.toFixed(2) }}</div>
          <div class="col-time">{{ formatTime(signal.created_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const health = ref<any>(null)
const signals = ref<any[]>([])
const filterTicker = ref('')

const todaySignals = computed(() => signals.value)
const buyCount = computed(() => signals.value.filter(s => s.signal_type === 'buy').length)
const sellCount = computed(() => signals.value.filter(s => s.signal_type === 'sell').length)

const filteredSignals = computed(() => {
  if (!filterTicker.value) return signals.value
  return signals.value.filter(s => s.ticker.includes(filterTicker.value.toUpperCase()))
})

const refreshData = async () => {
  try {
    const [healthRes, signalsRes] = await Promise.all([
      axios.get('/api/admin/health'),
      axios.get('/api/signals'),
    ])
    health.value = healthRes.data.data
    signals.value = signalsRes.data.data
  } catch (error) {
    console.error('Failed to refresh data:', error)
  }
}

const filterData = () => {
  // Filtering is done by computed property
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString()
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  refreshData()
  // Auto-refresh every 5 minutes
  setInterval(refreshData, 5 * 60 * 1000)
})
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  color: #2c3e50;
}

h2 {
  margin: 2rem 0 1rem;
  color: #34495e;
  font-size: 1.3rem;
}

.status-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.status-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 0.5rem;
}

.status-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.signals-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.3s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.search-input {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

.signals-table {
  border: 1px solid #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  background: #ecf0f1;
  padding: 1rem;
  font-weight: bold;
  gap: 1rem;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  padding: 1rem;
  border-bottom: 1px solid #ecf0f1;
  gap: 1rem;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.badge-buy {
  background: #d4edda;
  color: #155724;
}

.badge-sell {
  background: #f8d7da;
  color: #721c24;
}

@media (max-width: 768px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }

  .table-header {
    display: none;
  }

  .table-row {
    border: 1px solid #ecf0f1;
    margin-bottom: 1rem;
  }

  .table-row::before {
    content: attr(data-label);
    font-weight: bold;
    display: block;
  }
}
</style>
