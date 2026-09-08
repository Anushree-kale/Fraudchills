import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { resolveDatabaseUrl, remoteSslConfig, stripSslQueryParams } from './resolve-database-url.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

let connectionString;
try {
  connectionString = resolveDatabaseUrl();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

console.log('Connecting to Supabase Postgres...');
const pool = new pg.Pool({
  connectionString:connectionString.replace(/[?&]sslmode=[^&]*/i, ''),
  ssl: {
    rejectUnauthorized: false,
  },
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
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runInit();
