<template>
  <div class="admin-page">
    <h1>Admin Panel</h1>

    <div class="admin-section">
      <h2>Scan Management</h2>
      <button @click="forceScan" :disabled="scanning" class="btn btn-primary">
        {{ scanning ? 'Scanning...' : 'Force Scan Now' }}
      </button>
      <p v-if="scanMessage" class="message">{{ scanMessage }}</p>

      <!-- Scan Progress -->
      <div v-if="scanning" class="scan-progress">
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: scanProgress.progress + '%' }"></div>
        </div>
        <div class="progress-text">
          <p><strong>{{ scanProgress.progress }}% Complete</strong></p>
          <p v-if="scanProgress.tickersScanned">
            Checked: {{ scanProgress.tickersScanned }} / {{ scanProgress.totalTickers }} tickers
          </p>
          <p v-if="scanProgress.signalsGenerated">
            Signals Found: {{ scanProgress.signalsGenerated }}
          </p>
          <p v-if="scanProgress.estimatedRemainingSeconds && scanProgress.estimatedRemainingSeconds > 0">
            Estimated Time Remaining: {{ formatTime(scanProgress.estimatedRemainingSeconds) }}
          </p>
          <p v-else-if="scanProgress.message" class="progress-message">
            {{ scanProgress.message }}
          </p>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <h2>Turtle Trading Configuration</h2>
      <div class="config-grid">
        <div class="config-item">
          <label for="system-select">Trading System:</label>
          <select v-model="scanConfig.system" id="system-select" class="config-select">
            <option value="system1">System 1 (20-day Breakout - Aggressive)</option>
            <option value="system2">System 2 (55-day Breakout - Conservative)</option>
          </select>
          <p class="config-help">
            <strong>System 1:</strong> Fast entries, more signals | 
            <strong>System 2:</strong> Wait for confirmation, fewer signals
          </p>
        </div>

        <div class="config-item">
          <label for="trend-filter">
            <input 
              v-model="scanConfig.useTrendFilter" 
              type="checkbox" 
              id="trend-filter"
              class="config-checkbox"
            />
            Enable 200-day MA Trend Filter
          </label>
          <p class="config-help">
            Recommended: ON. Prevents counter-trend trades by only taking BUYs in uptrends and SELLs in downtrends.
          </p>
        </div>

        <div class="config-item">
          <label for="stop-loss-slider">Stop Loss Multiplier: <strong>{{ scanConfig.stopLossMultiplier.toFixed(1) }}x ATR</strong></label>
          <input 
            v-model.number="scanConfig.stopLossMultiplier" 
            type="range" 
            id="stop-loss-slider"
            min="1"
            max="3"
            step="0.1"
            class="config-slider"
          />
          <p class="config-help">
            System 1 default: 2.0x | System 2 default: 1.5x | Wider stop = more risk tolerance
          </p>
        </div>
      </div>

      <button @click="forceScanWithConfig" :disabled="scanning" class="btn btn-primary btn-large">
        {{ scanning ? 'Scanning with Config...' : 'Scan with Configuration' }}
      </button>
      
      <div v-if="configScanMessage" class="config-message">
        <p :class="`message ${configScanMessage.includes('Error') ? 'error' : 'success'}`">
          {{ configScanMessage }}
        </p>
      </div>

      <div v-if="lastConfigUsed" class="last-config-info">
        <p><strong>Last Scan Used:</strong></p>
        <ul>
          <li>System: {{ lastConfigUsed.system }}</li>
          <li>Trend Filter: {{ lastConfigUsed.useTrendFilter ? 'ON' : 'OFF' }}</li>
          <li>Stop Loss: {{ lastConfigUsed.stopLossMultiplier }}x ATR</li>
        </ul>
      </div>
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
      <h2>Ticker Management</h2>
      <div class="ticker-upload">
        <p>Upload a CSV file with one ticker per line to use a custom ticker list:</p>
        <p class="ticker-note">
          ⚠️ <strong>Note:</strong> Custom tickers will persist until you click "Reset to Russell 2000" below. 
          They will be used for all future scans (including automated 4 PM ET scans).
        </p>
        <div class="upload-input">
          <input 
            type="file" 
            accept=".csv,.txt" 
            @change="handleTickerFileUpload"
            ref="tickerFileInput"
            class="file-input"
          />
          <button @click="uploadTickersFromFile" :disabled="!tickerFileSelected" class="btn btn-primary">
            Upload Tickers
          </button>
        </div>
        <p v-if="tickerMessage" :class="`message ${tickerMessage.includes('Error') ? 'error' : 'success'}`">
          {{ tickerMessage }}
        </p>
        <p v-if="tickerSource" class="ticker-status">
          Currently using: <strong>{{ tickerSource }}</strong> ({{ tickerCount }} tickers)
          <button 
            v-if="tickerSource === 'Custom Upload'"
            @click="resetTickers" 
            class="btn btn-secondary btn-small"
          >
            Reset to Russell 2000
          </button>
        </p>
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
const configScanMessage = ref('')
const health = ref<any>(null)
const settings = ref<any>(null)
const scanHistory = ref<any[]>([])
const tickerFileInput = ref<HTMLInputElement>()
const tickerFileSelected = ref(false)
const tickerMessage = ref('')
const tickerSource = ref('')
const tickerCount = ref(0)
let progressInterval: NodeJS.Timeout | null = null

// Scan progress
const scanProgress = ref({
  progress: 0,
  tickersScanned: 0,
  totalTickers: 400,
  signalsGenerated: 0,
  elapsedSeconds: 0,
  estimatedRemainingSeconds: 0,
  message: '',
})

// Turtle Trading config
const scanConfig = ref({
  system: 'system1' as 'system1' | 'system2',
  useTrendFilter: true,
  stopLossMultiplier: 2.0,
})

const lastConfigUsed = ref<any>(null)

const loadScanProgress = async () => {
  try {
    const res = await axios.get('/api/admin/scan-progress')
    const data = res.data.data

    scanProgress.value.progress = data.progress || 0
    scanProgress.value.tickersScanned = data.tickersScanned || 0
    scanProgress.value.totalTickers = data.totalTickers || 400
    scanProgress.value.signalsGenerated = data.signalsGenerated || 0
    scanProgress.value.elapsedSeconds = data.elapsedSeconds || 0
    scanProgress.value.estimatedRemainingSeconds = data.estimatedRemainingSeconds || 0
    scanProgress.value.message = data.message || ''

    // If scan is complete, stop polling
    if (data.status === 'completed' || data.status === 'failed') {
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      scanning.value = false
      scanMessage.value = `Scan ${data.status}: ${data.signalsGenerated} signals generated`
      await loadHealth()
      await loadScanHistory()
    }
  } catch (error) {
    console.error('Failed to load scan progress:', error)
  }
}

const forceScan = async () => {
  scanning.value = true
  scanMessage.value = 'Starting scan...'
  try {
    const res = await axios.post('/api/admin/scan')
    scanMessage.value = res.data.data.message
    
    // Start polling for progress every 2 seconds
    if (progressInterval) {
      clearInterval(progressInterval)
    }
    progressInterval = setInterval(() => {
      loadScanProgress()
    }, 2000)

    // Initial progress load
    loadScanProgress()
  } catch (error) {
    scanMessage.value = 'Scan failed!'
    console.error('Failed to start scan:', error)
    scanning.value = false
  }
}

const forceScanWithConfig = async () => {
  scanning.value = true
  configScanMessage.value = `Starting scan: ${scanConfig.value.system} with ${scanConfig.value.useTrendFilter ? 'trend filter ON' : 'trend filter OFF'}...`
  try {
    const res = await axios.post('/api/admin/scan', {
      system: scanConfig.value.system,
      useTrendFilter: scanConfig.value.useTrendFilter,
      stopLossMultiplier: scanConfig.value.stopLossMultiplier,
    })
    configScanMessage.value = res.data.data.message
    lastConfigUsed.value = scanConfig.value

    // Start polling for progress every 2 seconds
    if (progressInterval) {
      clearInterval(progressInterval)
    }
    progressInterval = setInterval(() => {
      loadScanProgress()
    }, 2000)

    // Initial progress load
    loadScanProgress()
  } catch (error: any) {
    configScanMessage.value = `Error: ${error.response?.data?.error || 'Scan failed'}`
    console.error('Failed to start scan with config:', error)
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

const handleTickerFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  tickerFileSelected.value = target.files?.length ? true : false
}

const uploadTickersFromFile = async () => {
  if (!tickerFileInput.value?.files?.length) {
    tickerMessage.value = 'Error: No file selected'
    return
  }

  const file = tickerFileInput.value.files[0]
  const text = await file.text()
  const tickers = text
    .split('\n')
    .map(line => line.trim().toUpperCase())
    .filter(line => /^[A-Z]{1,5}$/.test(line))

  if (tickers.length === 0) {
    tickerMessage.value = 'Error: No valid tickers found in file'
    return
  }

  try {
    const res = await axios.post('/api/admin/tickers/upload', { tickers })
    tickerMessage.value = `Success: ${res.data.data.tickersAdded} tickers uploaded`
    tickerFileSelected.value = false
    if (tickerFileInput.value) tickerFileInput.value.value = ''
    await loadTickerStatus()
  } catch (error) {
    tickerMessage.value = `Error: Failed to upload tickers`
    console.error('Failed to upload tickers:', error)
  }
}

const loadTickerStatus = async () => {
  try {
    const res = await axios.get('/api/admin/tickers')
    tickerSource.value = res.data.data.source === 'custom' ? 'Custom Upload' : 'Default Russell 2000'
    tickerCount.value = res.data.data.count
  } catch (error) {
    console.error('Failed to load ticker status:', error)
  }
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleString()
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

const resetTickers = async () => {
  if (!confirm('Are you sure? This will reset to the default Russell 2000 ticker list.')) {
    return
  }

  try {
    const res = await axios.post('/api/admin/tickers/reset')
    tickerMessage.value = `Success: ${res.data.data.message}`
    await loadTickerStatus()
  } catch (error) {
    tickerMessage.value = 'Error: Failed to reset tickers'
    console.error('Failed to reset tickers:', error)
  }
}

onMounted(() => {
  loadHealth()
  loadSettings()
  loadTickerStatus()
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

.message.error {
  background: #fadbd8;
  color: #c0392b;
}

.message.success {
  background: #d5f4e6;
  color: #27ae60;
}

.ticker-upload {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.upload-input {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.file-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
}

.ticker-status {
  margin-top: 1rem;
  padding: 0.5rem;
  background: #ecf0f1;
  border-radius: 4px;
  font-size: 0.9rem;
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

.config-grid {
  display: grid;
  gap: 2rem;
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-item label {
  font-weight: bold;
  color: #34495e;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.config-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.config-select {
  padding: 0.75rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.config-select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.config-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ecf0f1;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.config-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
}

.config-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: none;
}

.config-help {
  font-size: 0.8rem;
  color: #7f8c8d;
  margin: 0;
  padding: 0.5rem;
  background: white;
  border-left: 3px solid #3498db;
  border-radius: 2px;
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  margin-top: 1rem;
}

.config-message {
  margin-top: 1rem;
}

.last-config-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #ecf0f1;
  border-radius: 4px;
  border-left: 4px solid #3498db;
}

.last-config-info p {
  margin: 0 0 0.5rem 0;
  font-weight: bold;
  color: #34495e;
}

.last-config-info ul {
  margin: 0;
  padding-left: 1.5rem;
}

.last-config-info li {
  color: #2c3e50;
  margin: 0.25rem 0;
}

.scan-progress {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f0f7ff;
  border: 1px solid #3498db;
  border-radius: 8px;
}

.progress-bar-container {
  width: 100%;
  height: 24px;
  background: #ecf0f1;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2980b9);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.85rem;
  font-weight: bold;
}

.progress-text {
  color: #2c3e50;
}

.progress-text p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
}

.progress-message {
  color: #3498db;
  font-style: italic;
}

.ticker-note {
  background: #fff3cd;
  border: 1px solid #ffc107;
  padding: 0.75rem;
  border-radius: 4px;
  color: #856404;
  font-size: 0.9rem;
  margin: 1rem 0;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  margin-left: 1rem;
}
</style>
