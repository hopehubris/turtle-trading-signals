import { initializeDatabase, getDatabase, closeDatabase } from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run database migrations
 * - Checks if database exists
 * - If not, creates it with schema
 * - If exists, validates schema (future: run pending migrations)
 */
export async function migrate(): Promise<void> {
  const dbPath = process.env.DB_PATH || 'data/signals.db';
  
  try {
    console.log(`🔄 Running database migrations...`);
    console.log(`📍 Database path: ${dbPath}`);

    // Initialize database (creates if doesn't exist, applies schema)
    await initializeDatabase(dbPath);

    // Validate schema by checking tables exist
    const db = getDatabase();
    
    const tables = [
      'signals',
      'trades',
      'scan_history',
      'portfolio_positions',
      'price_cache',
    ];

    console.log('\n📋 Validating tables...');
    for (const table of tables) {
      const result = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );
      
      if (result) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - MISSING!`);
        throw new Error(`Table ${table} does not exist after schema initialization`);
      }
    }

    console.log('\n✨ Database migration completed successfully!');
    console.log(`   ${tables.length} tables verified.`);
    
    await closeDatabase();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
migrate();
