import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // 1. Create budgets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title TEXT NOT NULL,
        icon TEXT DEFAULT '📊',
        color TEXT DEFAULT '#c6f150',
        budget_limit DECIMAL(12,2) DEFAULT 0,
        budget_type TEXT DEFAULT 'category', -- 'category', 'card', 'bank', 'all'
        period TEXT DEFAULT 'monthly',
        visibility TEXT DEFAULT 'shared',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table budgets created or already exists');

    // 2. Create budget_rules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_rules (
        id SERIAL PRIMARY KEY,
        budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
        rule_type TEXT NOT NULL, -- 'category', 'card', 'bank'
        rule_value TEXT NOT NULL -- id of the category, card or bank
      );
    `);
    console.log('Table budget_rules created or already exists');
    
    // 3. Add budget_id to transactions
    await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id);');
    console.log('Column budget_id added to transactions');
    
    // 4. Add budget_id to card_purchases
    await pool.query('ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id);');
    console.log('Column budget_id added to card_purchases');
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
