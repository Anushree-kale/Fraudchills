const { Pool } = require('pg');

const connectionString = "postgresql://fraudchills_2603_user:YrzxVkA72NU5OnA7cTCYqEIE0mNwcD5o@dpg-d828jenavr4c739j78d0-a.singapore-postgres.render.com/fraudchills_2603";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:');
    res.rows.forEach(row => console.log(` - ${row.table_name}`));
    
    // Check if 'users' table has 'role' column
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('\nColumns in users table:');
    columns.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type})`));

  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await pool.end();
  }
}

checkTables();
