-- ============================================================
-- Finanças App – Schema PostgreSQL v4 (Multi-Tenant)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Households (Casas) ─────────────────────────────────────
CREATE TABLE households (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) NOT NULL,
  invite_token VARCHAR(20) UNIQUE NOT NULL,
  status       VARCHAR(20) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO households (id, name, invite_token) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Família Alves', 'ALVES-X79K')
ON CONFLICT (id) DO NOTHING;

-- ─── Usuários ───────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id),
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  nickname     VARCHAR(60),
  pin          VARCHAR(6) DEFAULT '1234',
  avatar_url   TEXT,
  role         VARCHAR(20) DEFAULT 'member',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Dados Iniciais (Perfis Principais)
INSERT INTO users (id, name, nickname, email, pin, household_id, role) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Igor', 'Igor', 'igor@financas.app', '1234', 'a0000000-0000-0000-0000-000000000001', 'super_admin'),
  ('b2222222-2222-2222-2222-222222222222', 'Flávia', 'Flávia', 'flavia@financas.app', '5678', 'a0000000-0000-0000-0000-000000000001', 'member')
ON CONFLICT (id) DO NOTHING;


-- ─── Categorias ─────────────────────────────────────────────
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(60) NOT NULL UNIQUE,
  icon  VARCHAR(30) DEFAULT 'tag',
  color VARCHAR(7)  DEFAULT '#6366f1',
  type  VARCHAR(20) DEFAULT 'expense'
);

INSERT INTO categories (id, name, icon, color, type) VALUES
  (1, 'Salário',       '💰',           '#10b981', 'income'),
  (2, 'Moradia',       '🏠',           '#ec4899', 'expense'),
  (3, 'Transporte',    '🚗',           '#8b5cf6', 'expense'),
  (4, 'Alimentação',   '🍕',           '#f59e0b', 'expense'),
  (5, 'Lazer',         '🍿',           '#f97316', 'expense'),
  (6, 'Saúde',         '💊',           '#ef4444', 'expense'),
  (7, 'Educação',      '🎓',           '#3b82f6', 'expense'),
  (8, 'Assinaturas',   '📺',           '#a855f7', 'expense'),
  (9, 'Outros',        '📦',           '#64748b', 'expense'),
  (10, 'Investimentos', '📈',           '#C6F150', 'income'),
  (11, 'Compras',       '🛍️',           '#14b8a6', 'expense')
ON CONFLICT (id) DO NOTHING;

-- ─── Bancos / Contas ────────────────────────────────────────
CREATE TABLE banks (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(30) DEFAULT 'landmark',
  color       VARCHAR(7)  DEFAULT '#6366f1',
  balance     NUMERIC(12,2) DEFAULT 0,
  is_shared   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cartões de Crédito ────────────────────────────────────
CREATE TABLE credit_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  card_name       VARCHAR(60)   NOT NULL,
  card_brand      VARCHAR(30)   DEFAULT 'visa',
  credit_limit    NUMERIC(12,2) NOT NULL,
  closing_day     INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day         INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color           VARCHAR(7) DEFAULT '#6366f1',
  is_shared       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Transações ──────────────────────────────────────────────
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id     INT  REFERENCES categories(id),
  bank_id         INT  REFERENCES banks(id),
  card_id         UUID REFERENCES credit_cards(id),
  type            VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  description     VARCHAR(255) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  payment_method  VARCHAR(10) DEFAULT 'pix',
  visibility      VARCHAR(10) DEFAULT 'shared',
  is_paid         BOOLEAN DEFAULT TRUE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  time            TIME NOT NULL DEFAULT CURRENT_TIME,
  accounting_date DATE,
  effective_month VARCHAR(7) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  recurring_id    UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Metas ───────────────────────────────────────────────────
CREATE TABLE goals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  title          VARCHAR(100) NOT NULL,
  icon           VARCHAR(30)  DEFAULT 'piggy-bank',
  target_amount  NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline       DATE,
  color          VARCHAR(7) DEFAULT '#10b981',
  visibility     VARCHAR(10) DEFAULT 'shared',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Metas Iniciais (Exemplo)
-- INSERT INTO goals (user_id, title, target_amount, current_amount, color, icon, visibility) VALUES ...

-- ─── Gastos/Entradas Fixos (Recorrentes) ────────────────────
CREATE TABLE recurring_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id     INT  REFERENCES categories(id),
  bank_id         INT  REFERENCES banks(id),
  type            VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  description     VARCHAR(255) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  payment_method  VARCHAR(10) DEFAULT 'pix',
  visibility      VARCHAR(10) DEFAULT 'shared',
  day_of_month    INT DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 31),
  start_month     VARCHAR(7) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  end_month       VARCHAR(7),
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Meses excluídos ou com valor customizado
CREATE TABLE recurring_exceptions (
  id              SERIAL PRIMARY KEY,
  recurring_id    UUID REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  excluded_month  VARCHAR(7) NOT NULL,
  custom_amount   NUMERIC(12,2),
  UNIQUE(recurring_id, excluded_month)
);

-- ─── Contas a Pagar (Faturas) ────────────────────────────────
CREATE TABLE bills (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  service_name   VARCHAR(100) NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  due_date       DATE NOT NULL,
  status         VARCHAR(10) NOT NULL DEFAULT 'pending',
  barcode        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Compras no Cartão ──────────────────────────────────────
CREATE TABLE card_purchases (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id        UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
  category_id    INT REFERENCES categories(id),
  description    VARCHAR(255) NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  installments   INT DEFAULT 1,
  purchase_date  DATE DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Logs da Aplicação ──────────────────────────────────────
CREATE TABLE app_logs (
  id          SERIAL PRIMARY KEY,
  level       VARCHAR(10) DEFAULT 'info',
  source      VARCHAR(60),
  message     TEXT NOT NULL,
  details     JSONB,
  user_id     UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
