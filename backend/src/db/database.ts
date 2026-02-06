import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database | null = null;

/**
 * Initialize SQLite database
 */
export async function initializeDatabase(dbPath: string): Promise<Database> {
  // Ensure data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON;');

  // Load and run schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await db.exec(schema);

  console.log(`Database initialized at ${dbPath}`);
  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * Reset database (drops and recreates schema)
 */
export async function resetDatabase(dbPath: string): Promise<void> {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  await initializeDatabase(dbPath);
}
