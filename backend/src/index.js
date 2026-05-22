import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { setupSwagger } from './swagger.js';
import { setupSocket } from './socket.js';
import { householdGuard } from './middleware/household.js';

import authRoutes from './routes/auth.js';
import householdsRoutes from './routes/households.js';
import dashboardRoutes from './routes/dashboard.js';
import billsRoutes from './routes/bills.js';
import cardsRoutes from './routes/cards.js';
import goalsRoutes from './routes/goals.js';
import banksRoutes from './routes/banks.js';
import categoriesRoutes from './routes/categories.js';
import transactionsRoutes from './routes/transactions.js';
import budgetsRoutes from './routes/budgets.js';

// Auto-migration on startup – creates all missing tables and columns
(async () => {
  try {
    const pool = (await import('./db/pool.js')).default;

    // ── Tables ──
    await pool.query(`CREATE TABLE IF NOT EXISTS bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id),
      service_name TEXT NOT NULL, amount DECIMAL(12,2) DEFAULT 0, due_date DATE,
      status VARCHAR(20) DEFAULT 'pending', barcode TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS recurring_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id),
      category_id INTEGER REFERENCES categories(id), bank_id INTEGER REFERENCES banks(id),
      type VARCHAR(20) DEFAULT 'expense', description TEXT NOT NULL, amount DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(20) DEFAULT 'pix', visibility VARCHAR(20) DEFAULT 'shared',
      day_of_month INTEGER DEFAULT 1, start_month VARCHAR(7), end_month VARCHAR(7),
      time TIME DEFAULT '00:00:00', goal_id UUID REFERENCES goals(id), active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS recurring_exceptions (
      id SERIAL PRIMARY KEY, recurring_id UUID REFERENCES recurring_transactions(id) ON DELETE CASCADE,
      excluded_month VARCHAR(7) NOT NULL, custom_amount DECIMAL(12,2), UNIQUE(recurring_id, excluded_month)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS app_logs (
      id SERIAL PRIMARY KEY, level VARCHAR(20) DEFAULT 'info', source VARCHAR(50) DEFAULT 'app',
      message TEXT, details JSONB, user_id UUID REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id),
      title TEXT NOT NULL, icon TEXT DEFAULT '📊', color TEXT DEFAULT '#c6f150',
      budget_limit DECIMAL(12,2) DEFAULT 0, budget_type TEXT DEFAULT 'category',
      period TEXT DEFAULT 'monthly', visibility TEXT DEFAULT 'shared', is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS budget_rules (
      id SERIAL PRIMARY KEY, budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
      rule_type TEXT NOT NULL, rule_value TEXT NOT NULL
    )`);

    // ── Households table (must exist before FK references) ──
    await pool.query(`CREATE TABLE IF NOT EXISTS households (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      invite_token VARCHAR(20) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      currency VARCHAR(10) DEFAULT 'BRL',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);

    // ── Missing columns ──
    const alters = [
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS accounting_date DATE',
      'ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id)',
      'ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS accounting_date DATE',
      'ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS bank_id INTEGER REFERENCES banks(id)',
      'ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE banks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP',
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense'",
      "ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS time TIME DEFAULT '00:00:00'",
      'ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id)',
      'ALTER TABLE card_installments ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE card_installments ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE',
      'ALTER TABLE card_installments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR(14)',
      // ── Multi-tenant columns ──
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member'",
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE',
      'ALTER TABLE banks ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE goals ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE budgets ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE bills ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE card_purchases ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE app_logs ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE categories ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id)',
      'ALTER TABLE banks ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0',
      "ALTER TABLE households ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'BRL'",
    ];
    for (const q of alters) { try { await pool.query(q); } catch { /* ignore existing */ } }

    // ── Seed: default household + backfill ──
    const DEFAULT_HID = 'a0000000-0000-0000-0000-000000000001';
    await pool.query(
      `INSERT INTO households (id, name, invite_token) VALUES ($1, 'Gestão Residencial', 'CASA-DEMO') 
       ON CONFLICT (id) DO NOTHING`,
      [DEFAULT_HID]
    );
    // Link existing users to default household
    await pool.query(`UPDATE users SET household_id = $1, role = 'super_admin' WHERE id = 'a1111111-1111-1111-1111-111111111111' AND household_id IS NULL`, [DEFAULT_HID]);
    await pool.query(`UPDATE users SET household_id = $1, role = 'member' WHERE id = 'b2222222-2222-2222-2222-222222222222' AND household_id IS NULL`, [DEFAULT_HID]);
    // Backfill all transactional tables
    const backfillTables = ['banks', 'credit_cards', 'transactions', 'goals', 'budgets', 'bills', 'recurring_transactions', 'card_purchases', 'card_installments', 'app_logs'];
    for (const t of backfillTables) {
      try { await pool.query(`UPDATE ${t} SET household_id = $1 WHERE household_id IS NULL`, [DEFAULT_HID]); } catch { /* ignore */ }
    }

    // Backfill card_purchases accounting_date
    try {
      await pool.query(`UPDATE card_purchases SET accounting_date = purchase_date WHERE accounting_date IS NULL`);
    } catch (err) {
      console.warn('Erro ao atualizar accounting_date em card_purchases:', err.message);
    }

    console.log('✅ Auto-migration: all tables, columns, and households verified');
  } catch (err) {
    console.error('❌ Auto-migration failed:', err.message);
  }
})();
import logsRoutes from './routes/logs.js';
import recurringRoutes from './routes/recurring.js';
import webhooksRoutes from './routes/webhooks.js';
import pool from './db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// ─── Socket.IO ──────────────────────────────────────────────
setupSocket(httpServer);

// ─── Middlewares ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());

// ─── Static files (avatars) ────────────────────────────────
const uploadsPath = process.env.NODE_ENV === 'production' 
  ? '/app/uploads' 
  : path.resolve(__dirname, '..', 'uploads');

console.log(`[INFO] Configurando diretório estático: ${uploadsPath}`);
if (!fs.existsSync(uploadsPath)) {
  console.warn(`[WARN] Diretório de uploads não encontrado: ${uploadsPath}`);
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`[INFO] Diretório criado com sucesso.`);
  } catch (err) {
    console.error(`[ERROR] Falha ao criar diretório de uploads:`, err.message);
  }
}

app.use('/uploads', express.static(uploadsPath));

// ─── Swagger UI ─────────────────────────────────────────────
setupSwagger(app);

// ─── Debug Logger (Disabled) ───────────────────────────────────
app.use((req, res, next) => {
  next();
});

// ─── Root Redirect ──────────────────────────────────────────
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

// ─── Routes (public — no household guard) ───────────────────
app.use('/api/auth', authRoutes);

// ─── Routes (protected — household isolation) ───────────────
app.use('/api/households', householdGuard, householdsRoutes);
app.use('/api/dashboard', householdGuard, dashboardRoutes);
app.use('/api/bills', householdGuard, billsRoutes);
app.use('/api/cards', householdGuard, cardsRoutes);
app.use('/api/goals', householdGuard, goalsRoutes);
app.use('/api/banks', householdGuard, banksRoutes);
app.use('/api/categories', householdGuard, categoriesRoutes);  // protected, household isolation
app.use('/api/transactions', householdGuard, transactionsRoutes);
app.use('/api/logs', householdGuard, logsRoutes);
app.use('/api/recurring', householdGuard, recurringRoutes);
app.use('/api/webhooks', webhooksRoutes);  // external, no guard
app.use('/api/budgets', householdGuard, budgetsRoutes);

// ─── Setup / First-Run ────────────────────────────────────────
// GET /api/setup/status — verifica se há algum super_admin cadastrado
app.get('/api/setup/status', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT COUNT(*) as total FROM users WHERE role = 'super_admin'`);
    const isSetupDone = parseInt(rows[0].total) > 0;
    res.json({ setup_required: !isSetupDone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/setup/init — cria household + super admin (só funciona se não houver super_admin)
app.post('/api/setup/init', async (req, res) => {
  const client = await pool.connect();
  try {
    const { household_name, admin_name, admin_pin, currency = 'BRL' } = req.body;

    if (!household_name || !admin_name || !admin_pin) {
      return res.status(400).json({ error: 'household_name, admin_name e admin_pin são obrigatórios' });
    }
    if (String(admin_pin).length < 4 || String(admin_pin).length > 6) {
      return res.status(400).json({ error: 'PIN deve ter entre 4 e 6 dígitos' });
    }

    // Checa se já foi configurado
    const { rows: existing } = await client.query(`SELECT COUNT(*) as total FROM users WHERE role = 'super_admin'`);
    if (parseInt(existing[0].total) > 0) {
      return res.status(409).json({ error: 'Sistema já foi configurado. Faça login.' });
    }

    await client.query('BEGIN');

    // 1. Criar household
    const { rows: hhRows } = await client.query(
      `INSERT INTO households (name, currency, invite_token)
       VALUES ($1, $2, gen_random_uuid()::text)
       RETURNING *`,
      [household_name, currency]
    );
    const household = hhRows[0];

    // 2. Criar super admin
    const { rows: userRows } = await client.query(
      `INSERT INTO users (name, pin, role, household_id, is_active, full_name)
       VALUES ($1, $2, 'super_admin', $3, TRUE, $1)
       RETURNING id, name, role, household_id`,
      [admin_name, String(admin_pin), household.id]
    );
    const adminUser = userRows[0];

    await client.query('COMMIT');

    console.log(`🎉 Setup completo: Household "${household_name}" e Super Admin "${admin_name}" criados.`);

    res.status(201).json({
      message: 'Setup realizado com sucesso!',
      household: { id: household.id, name: household.name },
      user: adminUser
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Setup error:', err);
    res.status(500).json({ error: `Erro no setup: ${err.message}` });
  } finally {
    client.release();
  }
});

// ─── Health Check ───────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    // 1. Basic DB check
    await pool.query('SELECT 1');
    
    // 2. Schema basic check (optional)
    let schemaStatus = 'valid';
    try {
      await pool.query('SELECT id FROM users LIMIT 1');
    } catch (e) {
      schemaStatus = 'degraded';
      console.warn('Health check degraded (users):', e.message);
    }

    res.json({ 
      status: 'ok', 
      database: 'connected',
      schema: schemaStatus,
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    console.error('🔴 Health Check Failure:', err.message);
    res.status(503).json({ 
      status: 'error', 
      database: 'error',
      error: err.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// ─── 404 & Error Handling ────────────────────────────────────
app.use((req, res) => {
  console.warn(`⚠️ 404 - Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Rota não encontrada',
    method: req.method,
    path: req.originalUrl,
    hint: 'Verifique a documentação para ver as rotas disponíveis',
    docs: `http://${req.hostname}:${PORT}/api-docs`
  });
});

app.use(async (err, req, res, _next) => {
  console.error(`❌ [ERROR 500] ${req.method} ${req.url}:`, err);
  
  // Tenta logar no banco apenas se estiver conectado
  try {
    await pool.query(
      `INSERT INTO app_logs (level, source, message, details) VALUES ($1, $2, $3, $4)`,
      ['error', 'server', err.message, JSON.stringify({ stack: err.stack, url: req.originalUrl, method: req.method })]
    );
  } catch (logErr) {
    console.error('🔥 Falha ao registrar log de erro no banco:', logErr.message);
  }

  res.status(err.status || 500).json({ 
    error: err.message || 'Erro interno do servidor',
    code: err.code || 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? {
      system_error: err.stack,
      path: req.originalUrl,
      method: req.method,
      db_status: 'check /api/health'
    } : undefined
  });
});

// ─── Start ──────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Finanças API rodando na porta ${PORT}`);
  console.log(`📖 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`🔌 WebSocket:  ws://localhost:${PORT}/ws`);
});
