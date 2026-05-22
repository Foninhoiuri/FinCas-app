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
  const client = await pool.connect();
  try {
    console.log('🚀 Starting full migration...\n');
    await client.query('BEGIN');

    // ─── 1. Bills table ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        service_name TEXT NOT NULL,
        amount DECIMAL(12,2) DEFAULT 0,
        due_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        barcode TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table bills');

    // ─── 2. Recurring transactions table ──────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        category_id INTEGER REFERENCES categories(id),
        bank_id INTEGER REFERENCES banks(id),
        type VARCHAR(20) DEFAULT 'expense',
        description TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_method VARCHAR(20) DEFAULT 'pix',
        visibility VARCHAR(20) DEFAULT 'shared',
        day_of_month INTEGER DEFAULT 1,
        start_month VARCHAR(7),
        end_month VARCHAR(7),
        time TIME DEFAULT '00:00:00',
        goal_id UUID REFERENCES goals(id),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table recurring_transactions');

    // ─── 3. Recurring exceptions table ────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_exceptions (
        id SERIAL PRIMARY KEY,
        recurring_id UUID REFERENCES recurring_transactions(id) ON DELETE CASCADE,
        excluded_month VARCHAR(7) NOT NULL,
        custom_amount DECIMAL(12,2),
        UNIQUE(recurring_id, excluded_month)
      );
    `);
    console.log('✅ Table recurring_exceptions');

    // ─── 4. App logs table ────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) DEFAULT 'info',
        source VARCHAR(50) DEFAULT 'app',
        message TEXT,
        details JSONB,
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table app_logs');

    // ─── 5. Budgets table (if not exists) ─────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title TEXT NOT NULL,
        icon TEXT DEFAULT '📊',
        color TEXT DEFAULT '#c6f150',
        budget_limit DECIMAL(12,2) DEFAULT 0,
        budget_type TEXT DEFAULT 'category',
        period TEXT DEFAULT 'monthly',
        visibility TEXT DEFAULT 'shared',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table budgets');

    // ─── 6. Budget rules table ────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_rules (
        id SERIAL PRIMARY KEY,
        budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
        rule_type TEXT NOT NULL,
        rule_value TEXT NOT NULL
      );
    `);
    console.log('✅ Table budget_rules');

    // ─── 7. Missing columns ──────────────────────────────────
    const alterQueries = [
      // transactions
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS time TIME DEFAULT \'00:00:00\'',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS accounting_date DATE',
      // card_purchases
      'ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id)',
      'ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
      // credit_cards
      'ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS bank_id INTEGER REFERENCES banks(id)',
      'ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
      // banks
      'ALTER TABLE banks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
      // categories
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense'",
      // recurring_transactions
      "ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS time TIME DEFAULT '00:00:00'",
      'ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id)',
      // card_installments
      'ALTER TABLE card_installments ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE',
      'ALTER TABLE card_installments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE',
      // users
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)',
    ];

    for (const q of alterQueries) {
      try {
        await client.query(q);
      } catch (e) {
        // Ignore "already exists" type errors
        if (!e.message.includes('already exists')) {
          console.warn(`  ⚠️ ${q.slice(0, 60)}... → ${e.message}`);
        }
      }
    }
    console.log('✅ All missing columns added');

    await client.query('COMMIT');
    console.log('\n🎉 Full migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
