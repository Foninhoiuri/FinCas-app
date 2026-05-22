import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    // Check if the constraint exists and drop it, then add the new one
    console.log('Updating categories table constraints...');
    
    // First, remove the old unique constraint on 'name'
    // In PostgreSQL, we need to find the constraint name. Usually it's categories_name_key
    await pool.query('ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;');
    
    // Add the new composite unique constraint
    await pool.query('ALTER TABLE categories ADD CONSTRAINT categories_name_type_key UNIQUE (name, type);');
    
    console.log('Migration successful: categories unique constraint updated to (name, type)');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
