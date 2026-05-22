import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('🚀 Starting manual migration...');

    // 1. Ensure columns in users
    console.log('Checking users table...');
    const userCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    const userColNames = userCols.rows.map(c => c.column_name);
    
    if (!userColNames.includes('role')) {
      console.log('➕ Adding role to users...');
      await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'member'");
    }
    if (!userColNames.includes('is_active')) {
      console.log('➕ Adding is_active to users...');
      await pool.query("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
    }
    if (!userColNames.includes('full_name')) {
      console.log('➕ Adding full_name to users...');
      await pool.query("ALTER TABLE users ADD COLUMN full_name VARCHAR(255)");
    }
    if (!userColNames.includes('cpf')) {
      console.log('➕ Adding cpf to users...');
      await pool.query("ALTER TABLE users ADD COLUMN cpf VARCHAR(14)");
    }

    // 2. Fix card_purchases health check issues
    console.log('Checking card_purchases...');
    const cpCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'card_purchases'");
    const cpColNames = cpCols.rows.map(c => c.column_name);
    if (!cpColNames.includes('total_amount')) {
      console.log('➕ Adding total_amount to card_purchases...');
      await pool.query("ALTER TABLE card_purchases ADD COLUMN total_amount NUMERIC DEFAULT 0");
      await pool.query("UPDATE card_purchases SET total_amount = amount WHERE total_amount = 0");
    }

    // 3. Ensure households and backfill
    console.log('Checking default household...');
    const DEFAULT_HID = 'a0000000-0000-0000-0000-000000000001';
    await pool.query(
      `INSERT INTO households (id, name, invite_token) VALUES ($1, 'Família Principal', 'FINCAS-MAIN') ON CONFLICT (id) DO NOTHING`,
      [DEFAULT_HID]
    );

    console.log('Linking users to default household...');
    await pool.query(`UPDATE users SET household_id = $1 WHERE household_id IS NULL`, [DEFAULT_HID]);
    await pool.query(`UPDATE users SET role = 'super_admin' WHERE role IS NULL OR role = 'member'`); // Make existing users admins for now

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
