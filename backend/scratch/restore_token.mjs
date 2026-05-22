import pool from 'file:///z:/financas-app/backend/src/db/pool.js';

async function restore() {
  try {
    await pool.query(
      'UPDATE households SET invite_token = $1, name = $2 WHERE id = $3',
      ['FAML7C5A', 'Familia Alves', 'a0000000-0000-0000-0000-000000000001']
    );
    console.log('Token e Nome restaurados com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

restore();
