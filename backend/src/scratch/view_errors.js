import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    console.log('--- Last 5 Errors in app_logs ---');
    const { rows } = await pool.query('SELECT * FROM app_logs ORDER BY created_at DESC LIMIT 5');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching logs:', err.message);
    process.exit(1);
  }
}

check();
