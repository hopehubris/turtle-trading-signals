import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database
import { initializeDatabase, closeDatabase } from './db/database.js';

// Import routes
import signalsRouter from './routes/signals.js';
import tradesRouter from './routes/trades.js';
import adminRouter from './routes/admin.js';

// Import scheduler
import { initializeScheduler } from './jobs/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || 'data/signals.db';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use('/api/signals', signalsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/admin', adminRouter);

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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
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

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║       Turtle Trading Signals Server Started               ║
║                                                            ║
║  Server: http://localhost:${PORT}                          ║
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
