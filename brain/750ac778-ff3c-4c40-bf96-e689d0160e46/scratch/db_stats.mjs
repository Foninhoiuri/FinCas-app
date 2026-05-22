import pool from 'file:///z:/financas-app/backend/src/db/pool.js';

async function check() {
  try {
    const tables = ['users', 'households', 'transactions', 'banks', 'credit_cards', 'goals', 'budgets', 'bills'];
    const results = {};
    for (const t of tables) {
      const { rows } = await pool.query(`SELECT count(*) FROM ${t}`);
      results[t] = rows[0].count;
    }
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
