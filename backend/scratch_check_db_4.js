import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const { rows: cards } = await pool.query('SELECT id, card_name FROM credit_cards');
  console.log('Cards:', cards);
  
  const { rows: inst } = await pool.query('SELECT * FROM card_installments LIMIT 5');
  console.log('\nInstallments sample:', inst);
  
  if (cards.length > 0) {
    const cardId = cards[0].id;
    const { rows: invoice } = await pool.query(
      'SELECT billing_month, COUNT(*) FROM card_installments WHERE card_id = $1 GROUP BY billing_month',
      [cardId]
    );
    console.log(`\nInvoices for card ${cards[0].card_name}:`, invoice);
  }
  
  await pool.end();
}

check().catch(console.error);
