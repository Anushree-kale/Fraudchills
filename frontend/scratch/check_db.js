const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'accounts', 'sessions', 'verification_token');
    `);
    console.log('Tables found:', res.rows.map(r => r.table_name));
    
    const missing = ['users', 'accounts', 'sessions', 'verification_token'].filter(
      t => !res.rows.find(r => r.table_name === t)
    );
    
    if (missing.length > 0) {
      console.log('MISSING TABLES:', missing);
    } else {
      console.log('All required NextAuth tables exist.');
    }
  } catch (err) {
    console.error('Error checking tables:', err);
  } finally {
    await pool.end();
  }
}

checkTables();
