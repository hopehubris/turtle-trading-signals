import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
// Load .env.production if NODE_ENV=production, otherwise .env
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });

// Import database
import { initializeDatabase, closeDatabase } from './db/database.js';

// Import routes
import signalsRouter from './routes/signals.js';
import tradesRouter from './routes/trades.js';
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import portfolioRouter from './routes/portfolio.js';
import reportsRouter from './routes/reports.js';

// Import scheduler
import { initializeScheduler } from './jobs/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const DB_PATH = process.env.DB_PATH || 'data/signals.db';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend static files
// __dirname = /path/to/backend/src, so go up to project root and into frontend/dist
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
console.log(`Serving frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

// API Routes
app.use('/api/signals', signalsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/reports', reportsRouter);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

// Serve frontend for all non-API routes (SPA fallback)
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize database
    console.log(`Initializing database at ${DB_PATH}...`);
    await initializeDatabase(DB_PATH);

    // Start scheduler
    console.log('Initializing job scheduler...');
    initializeScheduler();

    // Start Express server (bind to 0.0.0.0 for network access)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║       Turtle Trading Signals Server Started               ║
║                                                            ║
║  Server: http://0.0.0.0:${PORT}                            ║
║  Access: http://192.168.1.51:${PORT}                       ║
║  Database: ${DB_PATH}                  ║
║  API: /api/signals, /api/trades, /api/admin               ║
║                                                            ║
║  Scheduler: Running (4 PM ET daily scan)                  ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start the server
startServer();
