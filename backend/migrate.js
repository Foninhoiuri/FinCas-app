import 'dotenv/config';
import pg from 'pg';

async function migrate() {
  console.log('🚀 Iniciando Migração Resiliente...');
  
  const originalUrl = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString: originalUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Garantir extensões
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    console.log('--- Verificando e Criando Tabelas Base ---');
    // Criar tabelas se não existirem (Estrutura Básica)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        nickname VARCHAR(60),
        pin VARCHAR(6) DEFAULT '1234',
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(60) NOT NULL UNIQUE,
        icon VARCHAR(30) DEFAULT 'tag',
        color VARCHAR(7) DEFAULT '#6366f1',
        type VARCHAR(20) DEFAULT 'expense'
      );
      CREATE TABLE IF NOT EXISTS banks (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(30) DEFAULT 'landmark',
        color VARCHAR(7) DEFAULT '#6366f1',
        balance NUMERIC(12,2) DEFAULT 0,
        is_shared BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS credit_cards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        card_name VARCHAR(60) NOT NULL,
        card_brand VARCHAR(30) DEFAULT 'visa',
        credit_limit NUMERIC(12,2) NOT NULL,
        closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
        due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
        color VARCHAR(7) DEFAULT '#6366f1',
        is_shared BOOLEAN DEFAULT TRUE,
        bank_id INT REFERENCES banks(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        category_id INT REFERENCES categories(id),
        bank_id INT REFERENCES banks(id),
        card_id UUID REFERENCES credit_cards(id),
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        payment_method VARCHAR(10) DEFAULT 'pix',
        visibility VARCHAR(10) DEFAULT 'shared',
        is_paid BOOLEAN DEFAULT TRUE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        time TIME NOT NULL DEFAULT CURRENT_TIME,
        accounting_date DATE,
        effective_month VARCHAR(7) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
        recurring_id UUID,
        goal_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS card_purchases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
        category_id INT REFERENCES categories(id),
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        installments INT DEFAULT 1,
        purchase_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS card_installments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id UUID REFERENCES card_purchases(id) ON DELETE CASCADE,
        card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
        installment_num INT NOT NULL,
        total_num INT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        description VARCHAR(255) NOT NULL,
        due_date DATE NOT NULL,
        billing_month VARCHAR(7) NOT NULL,
        is_paid BOOLEAN DEFAULT FALSE,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        icon VARCHAR(30) DEFAULT '📊',
        color VARCHAR(7) DEFAULT '#c6f150',
        budget_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
        budget_type VARCHAR(20) NOT NULL DEFAULT 'category',
        period VARCHAR(10) NOT NULL DEFAULT 'monthly',
        visibility VARCHAR(10) DEFAULT 'shared',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS budget_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
        rule_type VARCHAR(20) NOT NULL,
        rule_value VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('--- Garantindo Colunas para o Sistema de Parcelamento ---');
    // Forçar a criação das colunas novas em tabelas existentes
    await client.query(`
      DO $$ 
      BEGIN 
        -- Card Purchases
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_purchases' AND column_name='total_amount') THEN
          ALTER TABLE card_purchases ADD COLUMN total_amount NUMERIC(12,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_purchases' AND column_name='user_id') THEN
          ALTER TABLE card_purchases ADD COLUMN user_id UUID REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_purchases' AND column_name='is_paid') THEN
          ALTER TABLE card_purchases ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Transactions
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='goal_id') THEN
          ALTER TABLE transactions ADD COLUMN goal_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='is_paid') THEN
          ALTER TABLE transactions ADD COLUMN is_paid BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='budget_id') THEN
          ALTER TABLE transactions ADD COLUMN budget_id UUID REFERENCES budgets(id);
        END IF;

        -- Card Purchases
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_purchases' AND column_name='budget_id') THEN
          ALTER TABLE card_purchases ADD COLUMN budget_id UUID REFERENCES budgets(id);
        END IF;
      END $$;
    `);

    console.log('--- Sincronizando Dados Iniciais ---');
    // Seeder de categorias
    const catCheck = await client.query('SELECT 1 FROM categories LIMIT 1');
    if (catCheck.rowCount === 0) {
      await client.query(`
        INSERT INTO categories (id, name, icon, color, type) VALUES
        (1, 'Salário', '💰', '#10b981', 'income'), (2, 'Moradia', '🏠', '#ec4899', 'expense'),
        (3, 'Transporte', '🚗', '#8b5cf6', 'expense'), (4, 'Alimentação', '🍕', '#f59e0b', 'expense'),
        (5, 'Lazer', '🍿', '#f97316', 'expense'), (6, 'Saúde', '💊', '#ef4444', 'expense'),
        (7, 'Educação', '🎓', '#3b82f6', 'expense'), (8, 'Assinaturas', '📺', '#a855f7', 'expense'),
        (9, 'Outros', '📦', '#64748b', 'expense'), (10, 'Investimentos', '📈', '#C6F150', 'income'),
        (11, 'Compras', '🛍️', '#14b8a6', 'expense')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // Seeder de usuário Igor (para garantir acesso)
    await client.query(`
      INSERT INTO users (id, name, nickname, email, pin) 
      VALUES ('a1111111-1111-1111-1111-111111111111', 'Igor', 'Igor', 'igor@financas.app', '1234')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Backfill total_amount para evitar erros no dashboard
    await client.query(`
      UPDATE card_purchases SET total_amount = amount * COALESCE(installments, 1) WHERE total_amount IS NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Migração finalizada com todas as colunas garantidas!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Falha na migração:', err.message);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
