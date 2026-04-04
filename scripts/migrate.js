require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const sqlPath = path.join(__dirname, '../src/lib/init.sql');
    const fullSql = fs.readFileSync(sqlPath, 'utf8');

    // Only run the Auth.js / NextAuth portion of the schema.
    // The rest of this file contains app tables that are expected to be managed
    // by the backend SQLAlchemy models.
    const authOnlySql = fullSql.split('-- Complaints table')[0];

    console.log('--- Migrating Database ---');
    try {
        console.log('Dropping old auth tables for schema update...');
        await pool.query('DROP TABLE IF EXISTS accounts, sessions, verification_token, verification_tokens, users CASCADE;');
        await pool.query(authOnlySql);
        console.log('✅ Migration successful! Tables created with correct schema.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
