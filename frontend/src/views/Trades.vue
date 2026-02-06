<template>
  <div class="trades-page">
    <h1>Trade History</h1>

    <div class="form-section">
      <h2>Add Manual Trade</h2>
      <form @submit.prevent="addTrade" class="trade-form">
        <div class="form-group">
          <label>Ticker</label>
          <input v-model="newTrade.ticker" type="text" placeholder="AAPL" required />
        </div>
        <div class="form-group">
          <label>Entry Date</label>
          <input v-model="newTrade.entry_date" type="date" required />
        </div>
        <div class="form-group">
          <label>Entry Price</label>
          <input v-model.number="newTrade.entry_price" type="number" step="0.01" required />
        </div>
        <div class="form-group">
          <label>Shares</label>
          <input v-model.number="newTrade.entry_shares" type="number" required />
        </div>
        <button type="submit" class="btn btn-primary">Add Trade</button>
      </form>
    </div>

    <div class="trades-section">
      <h2>Trade List</h2>
      <div class="controls">
        <button @click="refreshTrades" class="btn btn-primary">Refresh</button>
      </div>

      <div v-if="trades.length === 0" class="empty-state">
        No trades recorded
      </div>

      <div v-else class="trades-table">
        <div class="table-header">
          <div class="col-ticker">Ticker</div>
          <div class="col-entry">Entry</div>
          <div class="col-price">Price</div>
          <div class="col-shares">Shares</div>
          <div class="col-status">Status</div>
          <div class="col-pnl">P&L %</div>
        </div>

        <div v-for="trade in trades" :key="trade.id" class="table-row">
          <div class="col-ticker">{{ trade.ticker }}</div>
          <div class="col-entry">{{ formatDate(trade.entry_date) }}</div>
          <div class="col-price">${{ trade.entry_price.toFixed(2) }}</div>
          <div class="col-shares">{{ trade.entry_shares }}</div>
          <div class="col-status">
            <span v-if="trade.exit_date" class="badge-closed">CLOSED</span>
            <span v-else class="badge-open">OPEN</span>
          </div>
          <div class="col-pnl" :class="{ gain: getPnL(trade) > 0, loss: getPnL(trade) < 0 }">
            {{ getPnL(trade).toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

const trades = ref<any[]>([])
const newTrade = ref({
  ticker: '',
  entry_date: new Date().toISOString().split('T')[0],
  entry_price: 0,
  entry_shares: 0,
})

const addTrade = async () => {
  try {
    await axios.post('/api/trades', newTrade.value)
    newTrade.value = {
      ticker: '',
      entry_date: new Date().toISOString().split('T')[0],
      entry_price: 0,
      entry_shares: 0,
    }
    refreshTrades()
  } catch (error) {
    console.error('Failed to add trade:', error)
  }
}

const refreshTrades = async () => {
  try {
    const res = await axios.get('/api/trades')
    trades.value = res.data.data
  } catch (error) {
    console.error('Failed to fetch trades:', error)
  }
}

const getPnL = (trade: any) => {
  if (!trade.exit_price) return 0
  return ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString()
}

onMounted(() => {
  refreshTrades()
})
</script>

<style scoped>
.trades-page {
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
}

h2 {
  margin: 2rem 0 1rem;
  color: #34495e;
  font-size: 1.3rem;
}

.form-section,
.trades-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.trade-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  align-items: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: bold;
  font-size: 0.9rem;
}

.form-group input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
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

.controls {
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

.trades-table {
  border: 1px solid #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  background: #ecf0f1;
  padding: 1rem;
  font-weight: bold;
  gap: 1rem;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  padding: 1rem;
  border-bottom: 1px solid #ecf0f1;
  gap: 1rem;
  align-items: center;
}

.badge-open {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #fff3cd;
  color: #856404;
  border-radius: 4px;
  font-size: 0.75rem;
}

.badge-closed {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #d4edda;
  color: #155724;
  border-radius: 4px;
  font-size: 0.75rem;
}

.gain {
  color: #27ae60;
  font-weight: bold;
}

.loss {
  color: #e74c3c;
  font-weight: bold;
}

@media (max-width: 768px) {
  .trade-form {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }

  .table-header {
    display: none;
  }
}
</style>
