<template>
  <div class="app">
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-brand">🐢 Turtle Trading Signals</div>
        <div class="nav-links">
          <router-link to="/dashboard" :class="{ active: route.path === '/dashboard' || route.path === '/' }">Dashboard</router-link>
          <router-link to="/trades" :class="{ active: route.path === '/trades' }">Trades</router-link>
          <router-link to="/analytics" :class="{ active: route.path === '/analytics' }">Analytics</router-link>
          <router-link to="/admin" :class="{ active: route.path === '/admin' }">Admin</router-link>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style>
.app {
  min-height: 100vh;
  background: #f5f5f5;
}

.navbar {
  background: #2c3e50;
  color: white;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: #bdc3c7;
  text-decoration: none;
  transition: color 0.3s;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.nav-links a:hover,
.nav-links a.active {
  color: white;
  background: rgba(255,255,255,0.1);
}

.main-content {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 2rem;
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .nav-links {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .main-content {
    padding: 0 1rem;
  }
}
</style>
