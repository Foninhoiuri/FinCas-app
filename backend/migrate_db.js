
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fix() {
  try {
    console.log('Connecting to DB at:', process.env.DATABASE_URL);
    
    // 1. Check if household_id exists in categories
    const { rows: cols } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'household_id'
    `);

    if (cols.length === 0) {
      console.log('Adding household_id to categories...');
      await pool.query(`ALTER TABLE categories ADD COLUMN household_id UUID`);
      
      // Get the first household to assign existing categories (to avoid empty lists)
      const { rows: hRows } = await pool.query('SELECT id FROM households LIMIT 1');
      if (hRows.length > 0) {
        console.log(`Assigning existing categories to household ${hRows[0].id}`);
        await pool.query(`UPDATE categories SET household_id = $1`, [hRows[0].id]);
      }
    } else {
      console.log('household_id already exists in categories');
    }

    console.log('Checking bank balance field...');
    const { rows: bankCols } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'banks' AND column_name = 'balance'
    `);
    if (bankCols.length === 0) {
      console.log('Adding balance to banks...');
      await pool.query(`ALTER TABLE banks ADD COLUMN balance NUMERIC DEFAULT 0`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error during DB fix:', err);
    process.exit(1);
  }
}

fix();
