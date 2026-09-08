import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDatabaseUrl, remoteSslConfig, stripSslQueryParams } from './resolve-database-url.mjs';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend/.env') });

const connectionString = resolveDatabaseUrl();
const pool = new pg.Pool({
  connectionString: stripSslQueryParams(connectionString),
  ssl: remoteSslConfig(connectionString),
});

async function addDefault() {
  try {
    console.log('Adding DEFAULT gen_random_uuid() to users.id ...');
    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
    `);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

addDefault();
