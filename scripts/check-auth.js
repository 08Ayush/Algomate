require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // 1. Check users table columns
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
  );
  console.log('\n=== users table columns ===');
  console.log(cols.rows.map(r => r.column_name).join(', '));

  // 2. Try the exact auth query
  const TEST_ID = '2d1a31bc-969f-4711-9e2f-65237ea3251d';
  try {
    const r = await pool.query(
      'SELECT id, email, role, college_id, department_id, faculty_type, first_name, last_name FROM users WHERE id = $1 LIMIT 1',
      [TEST_ID]
    );
    console.log('\n=== Auth query result ===');
    console.log('rows:', r.rowCount);
    console.log('data:', r.rows[0]);
  } catch (e) {
    console.error('\n=== Auth query FAILED ===');
    console.error(e.message);
  }

  // 3. Check admin_users table columns (for admin login path)
  const adminCols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_users' ORDER BY ordinal_position"
  ).catch(() => ({ rows: [] }));
  console.log('\n=== admin_users columns (if exists) ===');
  console.log(adminCols.rows.map(r => r.column_name).join(', ') || '(table not found)');

  // 4. Check notifications table
  const notifCols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position"
  ).catch(() => ({ rows: [] }));
  console.log('\n=== notifications columns ===');
  console.log(notifCols.rows.map(r => r.column_name).join(', ') || '(table not found)');

  await pool.end();
}
run().catch(console.error);
