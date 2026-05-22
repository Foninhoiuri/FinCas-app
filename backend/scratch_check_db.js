import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const { rows: tables } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.map(r => r.table_name));

    const { rows: columns } = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'credit_cards'");
    console.log('Columns for credit_cards:', columns);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
