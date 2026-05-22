import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const { Pool } = pg;

console.log('🔗 Usando DATABASE_URL:', process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetDB() {
  console.log('🔄 Iniciando reset do banco de dados...');
  const client = await pool.connect();
  try {
    console.log('🗑️ Apagando schema public...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    
    console.log('📄 Lendo schema.sql...');
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔨 Executando DDL/DML...');
    await client.query(schemaSql);
    
    console.log('✅ Banco de dados resetado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao resetar banco:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDB();
