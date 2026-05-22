
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fix() {
  try {
    console.log('Verificando tabela households...');
    
    await pool.query(`CREATE TABLE IF NOT EXISTS households (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      invite_token VARCHAR(20) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      currency VARCHAR(10) DEFAULT 'BRL',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ Tabela households verificada/criada.');

    const tables = [
      'users', 'banks', 'credit_cards', 'transactions', 'goals', 
      'budgets', 'bills', 'recurring_transactions', 'card_purchases', 
      'app_logs', 'categories'
    ];

    for (const t of tables) {
      console.log(`Verificando household_id em ${t}...`);
      try {
        await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)`);
      } catch (err) {
        console.warn(`⚠️ Erro ao alterar ${t}: ${err.message}`);
      }
    }

    console.log('✅ Todas as colunas de household_id verificadas.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  }
}

fix();
