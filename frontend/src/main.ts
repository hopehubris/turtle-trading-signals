import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// Import views
import Dashboard from './views/Dashboard.vue'
import Trades from './views/Trades.vue'
import Admin from './views/Admin.vue'
import Analytics from './views/Analytics.vue'
import Reports from './views/Reports.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/dashboard', component: Dashboard },
  { path: '/signals', component: Analytics },
  { path: '/reports', component: Reports },
  { path: '/trades', component: Trades },
  { path: '/analytics', component: Analytics },
  { path: '/admin', component: Admin },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
