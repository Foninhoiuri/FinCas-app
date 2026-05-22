
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    const DEFAULT_HID = 'a0000000-0000-0000-0000-000000000001';
    
    // 1. Create default household if not exists
    await pool.query(
      `INSERT INTO households (id, name, invite_token) VALUES ($1, 'Família Principal', 'FAMILIA-01') ON CONFLICT (id) DO NOTHING`,
      [DEFAULT_HID]
    );

    // 2. Assign NULL household_id to default household
    const tables = [
      'users', 'banks', 'credit_cards', 'transactions', 'goals', 
      'budgets', 'bills', 'recurring_transactions', 'card_purchases', 
      'app_logs', 'categories'
    ];

    for (const t of tables) {
      const { rowCount } = await pool.query(`UPDATE ${t} SET household_id = $1 WHERE household_id IS NULL`, [DEFAULT_HID]);
      if (rowCount > 0) console.log(`Assigned ${rowCount} rows in ${t} to default household.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
