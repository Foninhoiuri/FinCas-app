
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT t.category_id, c.name, c.household_id
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.category_id IS NOT NULL
      LIMIT 10
    `);
    console.log('Transactions categories:', rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
