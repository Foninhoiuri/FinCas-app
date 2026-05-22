import 'dotenv/config';
import pg from 'pg';

async function fixIsolation() {
  console.log('🛡️ Iniciando Migração de Isolamento de Dados (Multi-Tenant)...');
  
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  const tables = [
    'banks', 'credit_cards', 'transactions', 'goals', 
    'recurring_transactions', 'bills', 'card_purchases', 
    'budgets', 'app_logs'
  ];

  try {
    await client.query('BEGIN');

    for (const table of tables) {
      console.log(`  - Processando tabela: ${table}`);
      
      // 1. Adicionar coluna household_id se não existir
      await client.query(`
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)
      `);

      // 2. Backfill: popular household_id baseado no user_id da própria tabela
      // Note: card_installments não precisa pois card_purchases já tem.
      if (table !== 'card_installments') {
         await client.query(`
           UPDATE ${table} t
           SET household_id = u.household_id
           FROM users u
           WHERE t.user_id = u.id AND t.household_id IS NULL
         `);
      }
    }

    // 3. Caso especial para card_installments (vinculado via purchase_id ou card_id)
    console.log('  - Processando card_installments');
    await client.query('ALTER TABLE card_installments ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)');
    await client.query(`
      UPDATE card_installments ci
      SET household_id = cc.household_id
      FROM credit_cards cc
      WHERE ci.card_id = cc.id AND ci.household_id IS NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Isolamento de dados concluído com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Falha crítica no isolamento:', err.message);
  } finally {
    client.release();
    process.exit();
  }
}

fixIsolation();
