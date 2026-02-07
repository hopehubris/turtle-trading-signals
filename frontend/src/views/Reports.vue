<template>
  <div class="reports-page">
    <h1>Market Reports & Analytics</h1>
    <p class="subtitle">Comprehensive analysis of cached price data</p>

    <!-- Loading & Error States -->
    <div v-if="loading" class="loading-message">
      Loading market analysis...
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="loadReports" class="btn btn-primary">Retry</button>
    </div>

    <!-- Search & Filter Section -->
    <div v-if="!loading && !error" class="search-section">
      <h2>Search & Filter</h2>
      <div class="filter-grid">
        <div class="filter-item">
          <label>RSI Range:</label>
          <div class="range-input">
            <input v-model.number="filters.minRSI" type="number" min="0" max="100" placeholder="Min" />
            <span>-</span>
            <input v-model.number="filters.maxRSI" type="number" min="0" max="100" placeholder="Max" />
          </div>
        </div>

        <div class="filter-item">
          <label>Price Change (%):</label>
          <div class="range-input">
            <input v-model.number="filters.minChange" type="number" step="0.1" placeholder="Min" />
            <span>-</span>
            <input v-model.number="filters.maxChange" type="number" step="0.1" placeholder="Max" />
          </div>
        </div>

        <div class="filter-item">
          <label>Volatility (%):</label>
          <div class="range-input">
            <input v-model.number="filters.minVolatility" type="number" step="0.1" placeholder="Min" />
            <span>-</span>
            <input v-model.number="filters.maxVolatility" type="number" step="0.1" placeholder="Max" />
          </div>
        </div>

        <div class="filter-item">
          <label>Price vs EMA200 (%):</label>
          <div class="range-input">
            <input v-model.number="filters.priceFromEMA200Min" type="number" step="0.1" placeholder="Min" />
            <span>-</span>
            <input v-model.number="filters.priceFromEMA200Max" type="number" step="0.1" placeholder="Max" />
          </div>
        </div>
      </div>

      <button @click="performSearch" class="btn btn-primary btn-large">Search</button>
      <button @click="resetFilters" class="btn btn-secondary">Reset</button>
    </div>

    <!-- Reports Tabs -->
    <div v-if="!loading && !error && reports" class="reports-container">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ active: activeTab === tab.id }"
          class="tab-button"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Top Gainers -->
      <div v-if="activeTab === 'gainers'" class="tab-content">
        <h2>Top Gainers (Daily)</h2>
        <table-view :data="reports.topGainers" />
      </div>

      <!-- Top Losers -->
      <div v-if="activeTab === 'losers'" class="tab-content">
        <h2>Top Losers (Daily)</h2>
        <table-view :data="reports.topLosers" />
      </div>

      <!-- Most Volatile -->
      <div v-if="activeTab === 'volatile'" class="tab-content">
        <h2>Most Volatile (20-day)</h2>
        <table-view :data="reports.mostVolatile" :highlight-column="'volatility'" />
      </div>

      <!-- Near ATH -->
      <div v-if="activeTab === 'ath'" class="tab-content">
        <h2>Near All-Time Highs (within 5%)</h2>
        <table-view :data="reports.nearATH" :highlight-column="'percentFromHigh'" />
      </div>

      <!-- Near ATL -->
      <div v-if="activeTab === 'atl'" class="tab-content">
        <h2>Near All-Time Lows (within 5%)</h2>
        <table-view :data="reports.nearATL" :highlight-column="'percentFromLow'" />
      </div>

      <!-- Near EMA200 -->
      <div v-if="activeTab === 'ema'" class="tab-content">
        <h2>Near 200-day EMA (within 5%)</h2>
        <table-view :data="reports.nearEMA200" :highlight-column="'priceVsEma200'" />
      </div>

      <!-- Overbought -->
      <div v-if="activeTab === 'overbought'" class="tab-content">
        <h2>Overbought (RSI > 70)</h2>
        <table-view :data="reports.overbought" :highlight-column="'rsi14'" />
      </div>

      <!-- Oversold -->
      <div v-if="activeTab === 'oversold'" class="tab-content">
        <h2>Oversold (RSI < 30)</h2>
        <table-view :data="reports.oversold" :highlight-column="'rsi14'" />
      </div>

      <!-- Search Results -->
      <div v-if="activeTab === 'search' && searchResults" class="tab-content">
        <h2>Search Results ({{ searchResults.returned }} of {{ searchResults.totalMatching }})</h2>
        <table-view :data="searchResults.results" />
      </div>

      <!-- Summary Stats -->
      <div v-if="activeTab === 'summary'" class="tab-content">
        <h2>Summary Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Stocks Analyzed</div>
            <div class="stat-value">{{ reports.totalStocksAnalyzed }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Top Gainer</div>
            <div class="stat-value">{{ reports.topGainers[0]?.ticker }}</div>
            <div class="stat-subvalue">+{{ reports.topGainers[0]?.changePercent }}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Top Loser</div>
            <div class="stat-value">{{ reports.topLosers[0]?.ticker }}</div>
            <div class="stat-subvalue">{{ reports.topLosers[0]?.changePercent }}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Most Volatile</div>
            <div class="stat-value">{{ reports.mostVolatile[0]?.ticker }}</div>
            <div class="stat-subvalue">{{ reports.mostVolatile[0]?.volatility }}% vol</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import TableView from '../components/TableView.vue'

const loading = ref(false)
const error = ref('')
const reports = ref<any>(null)
const searchResults = ref<any>(null)
const activeTab = ref('gainers')

const tabs = [
  { id: 'gainers', label: '📈 Top Gainers' },
  { id: 'losers', label: '📉 Top Losers' },
  { id: 'volatile', label: '⚡ Most Volatile' },
  { id: 'ath', label: '🔝 Near ATH' },
  { id: 'atl', label: '🔻 Near ATL' },
  { id: 'ema', label: '↗️ Near EMA200' },
  { id: 'overbought', label: '🔴 Overbought' },
  { id: 'oversold', label: '🟢 Oversold' },
  { id: 'search', label: '🔍 Search Results' },
  { id: 'summary', label: '📊 Summary' },
]

const filters = ref({
  minRSI: null as number | null,
  maxRSI: null as number | null,
  minChange: null as number | null,
  maxChange: null as number | null,
  minVolatility: null as number | null,
  maxVolatility: null as number | null,
  priceFromEMA200Min: null as number | null,
  priceFromEMA200Max: null as number | null,
})

const loadReports = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/reports/analysis')
    reports.value = res.data.data
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load reports'
  } finally {
    loading.value = false
  }
}

const performSearch = async () => {
  loading.value = true
  error.value = ''
  try {
    const params: any = {}
    if (filters.value.minRSI !== null) params.minRSI = filters.value.minRSI
    if (filters.value.maxRSI !== null) params.maxRSI = filters.value.maxRSI
    if (filters.value.minChange !== null) params.minChange = filters.value.minChange
    if (filters.value.maxChange !== null) params.maxChange = filters.value.maxChange
    if (filters.value.minVolatility !== null) params.minVolatility = filters.value.minVolatility
    if (filters.value.maxVolatility !== null) params.maxVolatility = filters.value.maxVolatility
    if (filters.value.priceFromEMA200Min !== null) params.priceFromEMA200Min = filters.value.priceFromEMA200Min
    if (filters.value.priceFromEMA200Max !== null) params.priceFromEMA200Max = filters.value.priceFromEMA200Max

    const res = await axios.get('/api/reports/search', { params })
    searchResults.value = res.data.data
    activeTab.value = 'search'
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Search failed'
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.value = {
    minRSI: null,
    maxRSI: null,
    minChange: null,
    maxChange: null,
    minVolatility: null,
    maxVolatility: null,
    priceFromEMA200Min: null,
    priceFromEMA200Max: null,
  }
  searchResults.value = null
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.reports-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #7f8c8d;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.loading-message,
.error-message {
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  font-size: 1rem;
}

.loading-message {
  background: #d4edda;
  color: #155724;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
}

.search-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.search-section h2 {
  color: #34495e;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-item label {
  font-weight: bold;
  color: #34495e;
  font-size: 0.9rem;
}

.range-input {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.range-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.3s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  margin-left: 1rem;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.reports-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 2px solid #ecf0f1;
  background: #f8f9fa;
}

.tab-button {
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #7f8c8d;
  font-weight: 500;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}

.tab-button:hover {
  color: #34495e;
  background: #ecf0f1;
}

.tab-button.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.tab-content {
  padding: 2rem;
}

.tab-content h2 {
  color: #34495e;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.stat-subvalue {
  font-size: 0.9rem;
  opacity: 0.85;
}
</style>
