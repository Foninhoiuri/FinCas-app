import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    console.log('Testing SELECT 1...');
    await pool.query('SELECT 1');
    console.log('Testing SELECT total_amount FROM card_purchases LIMIT 1...');
    const res = await pool.query('SELECT total_amount FROM card_purchases LIMIT 1');
    console.log('Success!', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exit(1);
  }
}
check();
