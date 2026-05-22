
import pool from './src/db/pool.js';

async function fix() {
  try {
    // 1. Check if household_id exists in categories
    const { rows: cols } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'household_id'
    `);

    if (cols.length === 0) {
      console.log('Adding household_id to categories...');
      await pool.query(`ALTER TABLE categories ADD COLUMN household_id UUID`);
      // Link existing categories to the first household found or leave NULL for global
      // For now, let's just add the column.
    } else {
      console.log('household_id already exists in categories');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
