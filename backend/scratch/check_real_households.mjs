import pg from 'pg';
const { Pool } = pg;

const url = 'postgresql://financas_user:financas_secret_2024@192.168.1.140:5432/financas_db';
const pool = new Pool({ connectionString: url });

async function check() {
  try {
    const { rows } = await pool.query('SELECT id, name, invite_token FROM households');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
