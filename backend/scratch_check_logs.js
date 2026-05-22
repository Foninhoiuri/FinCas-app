import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const { rows } = await pool.query('SELECT * FROM app_logs ORDER BY created_at DESC LIMIT 20');
  console.log('Recent Logs:', rows);
  await pool.end();
}

check().catch(console.error);
