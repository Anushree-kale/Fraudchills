import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { resolveDatabaseUrl, remoteSslConfig, stripSslQueryParams } from './resolve-database-url.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const connectionString = resolveDatabaseUrl();
const pool = new pg.Pool({
  connectionString: stripSslQueryParams(connectionString),
  ssl: remoteSslConfig(connectionString),
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));

    for (const table of ['users', 'accounts', 'sessions', 'verification_token']) {
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`Columns in ${table}:`, cols.rows);
    }
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkSchema();
