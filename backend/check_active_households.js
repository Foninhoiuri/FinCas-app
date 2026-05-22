
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT household_id FROM users WHERE household_id IS NOT NULL
    `);
    console.log('Active Household IDs in use:', rows.map(r => r.household_id));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
