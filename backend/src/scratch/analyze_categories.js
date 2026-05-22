import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const r = await pool.query("SELECT * FROM categories");
  console.log('Total categories:', r.rows.length);
  const shared = r.rows.filter(c => !c.household_id);
  console.log('Global categories (no household_id):', shared.length);
  if (shared.length > 0) console.log(shared);

  const duplicates = await pool.query(`
    SELECT name, type, COUNT(*) 
    FROM categories 
    GROUP BY name, type 
    HAVING COUNT(*) > 1
  `);
  console.log('Duplicate names across houses:', duplicates.rows);
  process.exit(0);
}
check();
