import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const r = await pool.query("SELECT id, name, household_id FROM users");
  console.table(r.rows);
  
  const h = await pool.query("SELECT id, name FROM households");
  console.table(h.rows);
  
  process.exit(0);
}
check();
