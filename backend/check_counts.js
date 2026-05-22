
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const { rows: t } = await pool.query(`SELECT COUNT(*) FROM transactions`);
    const { rows: c } = await pool.query(`SELECT COUNT(*) FROM card_purchases`);
    console.log('Transactions count:', t[0].count);
    console.log('Card purchases count:', c[0].count);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
