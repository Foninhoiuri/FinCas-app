import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const tables = ['transactions', 'card_installments', 'card_purchases', 'banks'];
  for (const table of tables) {
    const { rows } = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = $1`,
      [table]
    );
    console.log(`\nColumns for ${table}:`, rows);
  }
  await pool.end();
}

check().catch(console.error);
