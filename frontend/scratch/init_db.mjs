import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the frontend directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('Connecting to database...');
const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Render/many hosted DBs
  }
});

async function runInit() {
  try {
    const sqlPath = path.resolve(__dirname, '../src/lib/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running init.sql...');
    await pool.query(sql);
    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

runInit();
