import pg from 'pg';
const { Pool } = pg;

const url = 'postgresql://financas_user:financas_secret_2024@192.168.1.140:5432/financas_db';
const pool = new Pool({ connectionString: url });

async function check() {
  try {
    const { rows } = await pool.query('SELECT u.id, u.name, h.name as household, h.invite_token FROM users u JOIN households h ON u.household_id = h.id');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
