import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local which contains DATABASE_URL
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function addDefault() {
  try {
    console.log('Adding DEFAULT gen_random_uuid() to users.id ...');
    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
    `);
    console.log('✅ Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

addDefault();
