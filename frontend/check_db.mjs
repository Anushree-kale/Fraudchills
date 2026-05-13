import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://fraudchills_2603_user:YrzxVkA72NU5OnA7cTCYqEIE0mNwcD5o@dpg-d828jenavr4c739j78d0-a.singapore-postgres.render.com/fraudchills_2603",
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    console.log('Connecting to database...');
    
    // List all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\n=== Tables in database ===');
    tables.rows.forEach(r => console.log(' -', r.table_name));

    // Check users table columns
    const usersCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('\n=== users table columns ===');
    usersCols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type}) nullable:${r.is_nullable} default:${r.column_default}`));

    // Check accounts table columns
    const accountsCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'accounts' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('\n=== accounts table columns ===');
    accountsCols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type}) nullable:${r.is_nullable}`));

    // Check sessions table columns
    const sessionsCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('\n=== sessions table columns ===');
    sessionsCols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type}) nullable:${r.is_nullable}`));

    // Count existing users
    const count = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\n=== User count: ${count.rows[0].count} ===`);

    // Try a test insert to see if the users table accepts new rows
    console.log('\n=== Testing insert into users ===');
    try {
      const testInsert = await pool.query(`
        INSERT INTO users (name, email, "emailVerified", image)
        VALUES ($1, $2, NULL, NULL)
        RETURNING id, name, email
      `, ['__test_user__', '__test_' + Date.now() + '@test.com']);
      console.log('Test insert succeeded:', testInsert.rows[0]);
      // Clean up
      await pool.query('DELETE FROM users WHERE name = $1', ['__test_user__']);
      console.log('Test user deleted.');
    } catch (e) {
      console.error('Test insert FAILED:', e.message);
    }

  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTables();
