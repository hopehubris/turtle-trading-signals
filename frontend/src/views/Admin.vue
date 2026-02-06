<template>
  <div class="admin-page">
    <h1>Admin Panel</h1>

    <div class="admin-section">
      <h2>Scan Management</h2>
      <button @click="forceScan" :disabled="scanning" class="btn btn-primary">
        {{ scanning ? 'Scanning...' : 'Force Scan Now' }}
      </button>
      <p v-if="scanMessage" class="message">{{ scanMessage }}</p>
    </div>

    <div class="admin-section">
      <h2>System Status</h2>
      <div v-if="health" class="status-info">
        <div class="status-item">
          <span class="label">Status:</span>
          <span class="value">{{ health.status }}</span>
        </div>
        <div class="status-item">
          <span class="label">Database:</span>
          <span class="value">{{ health.databaseConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <div class="status-item" v-if="health.lastScan">
          <span class="label">Last Scan:</span>
          <span class="value">{{ formatDateTime(health.lastScan.created_at) }}</span>
        </div>
        <div class="status-item" v-if="health.lastScan">
          <span class="label">Signals Generated:</span>
          <span class="value">{{ health.lastScan.signals_generated }}</span>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <h2>Settings</h2>
      <div v-if="settings" class="settings-grid">
        <div class="setting">
          <span class="label">Scan Time (ET):</span>
          <span class="value">{{ settings.scanTime }}</span>
        </div>
        <div class="setting">
          <span class="label">Min Volume Filter:</span>
          <span class="value">{{ settings.minVolumeFilter }}</span>
        </div>
        <div class="setting">
          <span class="label">Liquidity Filter:</span>
          <span class="value">{{ settings.liquidityFilter ? 'Enabled' : 'Disabled' }}</span>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <h2>Scan History</h2>
      <button @click="loadScanHistory" class="btn btn-secondary">Load History</button>

      <div v-if="scanHistory.length > 0" class="scan-history-table">
        <div class="table-header">
          <div class="col-date">Date</div>
          <div class="col-trigger">Trigger</div>
          <div class="col-tickers">Tickers</div>
          <div class="col-signals">Signals</div>
          <div class="col-status">Status</div>
        </div>

        <div v-for="scan in scanHistory" :key="scan.id" class="table-row">
          <div class="col-date">{{ formatDateTime(scan.created_at) }}</div>
          <div class="col-trigger">{{ scan.scan_trigger }}</div>
          <div class="col-tickers">{{ scan.tickers_scanned }}</div>
          <div class="col-signals">{{ scan.signals_generated }}</div>
          <div class="col-status">
            <span :class="`badge-${scan.scan_status}`">{{ scan.scan_status.toUpperCase() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

const scanning = ref(false)
const scanMessage = ref('')
const health = ref<any>(null)
const settings = ref<any>(null)
const scanHistory = ref<any[]>([])

const forceScan = async () => {
  scanning.value = true
  scanMessage.value = 'Starting scan...'
  try {
    const res = await axios.post('/api/admin/scan')
    scanMessage.value = res.data.data.message
    // Reload health status after a delay
    setTimeout(async () => {
      await loadHealth()
    }, 2000)
  } catch (error) {
    scanMessage.value = 'Scan failed!'
    console.error('Failed to start scan:', error)
  } finally {
    scanning.value = false
  }
}

const loadHealth = async () => {
  try {
    const res = await axios.get('/api/admin/health')
    health.value = res.data.data
  } catch (error) {
    console.error('Failed to load health:', error)
  }
}

const loadSettings = async () => {
  try {
    const res = await axios.get('/api/admin/settings')
    settings.value = res.data.data
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

const loadScanHistory = async () => {
  try {
    const res = await axios.get('/api/admin/scan-history')
    scanHistory.value = res.data.data
  } catch (error) {
    console.error('Failed to load scan history:', error)
  }
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleString()
}

onMounted(() => {
  loadHealth()
  loadSettings()
})
</script>

<style scoped>
.admin-page {
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
}

h2 {
  margin: 0 0 1rem 0;
  color: #34495e;
  font-size: 1.2rem;
}

.admin-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 0.9rem;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-primary:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #34495e;
  color: white;
}

.btn-secondary:hover {
  background: #2c3e50;
}

.message {
  margin-top: 1rem;
  padding: 1rem;
  background: #ecf0f1;
  border-radius: 4px;
  color: #2c3e50;
}

.status-info {
  display: grid;
  gap: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #ecf0f1;
}

.status-item .label {
  font-weight: bold;
  color: #34495e;
}

.status-item .value {
  color: #2c3e50;
}

.settings-grid {
  display: grid;
  gap: 1rem;
}

.setting {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #ecf0f1;
}

.setting .label {
  font-weight: bold;
}

.scan-history-table {
  border: 1px solid #ecf0f1;
  border-radius: 4px;
  margin-top: 1rem;
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

.badge-completed {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #d4edda;
  color: #155724;
  border-radius: 4px;
  font-size: 0.75rem;
}

.badge-failed {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  font-size: 0.75rem;
}

.badge-in_progress {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #fff3cd;
  color: #856404;
  border-radius: 4px;
  font-size: 0.75rem;
}
</style>
