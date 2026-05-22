import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const { rows: cols } = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'card_purchases'");
    console.log('Columns for card_purchases:', cols);

    const { rows: cols2 } = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'card_installments'");
    console.log('Columns for card_installments:', cols2);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
