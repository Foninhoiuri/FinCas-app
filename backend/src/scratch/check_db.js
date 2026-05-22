import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log(`Found ${tables.rows.length} tables`);
    
    for (const table of tables.rows) {
      console.log(`\n=== TABLE: ${table.table_name} ===`);
      const columns = await pool.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table.table_name}' ORDER BY ordinal_position`);
      console.log(JSON.stringify(columns.rows, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
