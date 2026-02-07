module.exports = {
  apps: [
    {
      name: 'turtle-trading-signals',
      script: 'dist/backend/src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_PATH: './data/signals.db',
        LOG_LEVEL: 'info',
        SCAN_TIME: '16:00',
        SCAN_TIMEZONE: 'America/New_York',
        RUSSELL_THRESHOLD: 2000,
        MIN_VOLUME_FILTER: 100000,
        LIQUIDITY_FILTER: 'true',
        TIMEOUT_MINUTES: 5,
        POLYGON_API_KEY: '' // Leave empty to use Yahoo Finance fallback
      },
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Development vs Production
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ],
  
  // Deploy configuration (optional, for future use)
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:repo.git',
      path: '/var/www/turtle-trading-signals',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production'
    }
  }
};
