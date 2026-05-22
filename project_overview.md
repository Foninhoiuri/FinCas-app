# 💰 FinCas — Visão Geral do Projeto (v3.0 International Multi-Tenant)

- **Arquitetura Multi-Tenant**: Organização por "Casas" (Households) com isolamento absoluto de dados.
- **Localização Dinâmica**: Suporte a múltiplas moedas (`BRL`, `USD`, `CAD`, `EUR`, `GBP`) configuráveis por Casa.
- **Controle de Acesso por Papel**: Super Admin, Admin da Casa e Membro com permissões granulares.
- **Device Binding**: Cada dispositivo é amarrado a uma Casa via código de convite, mantendo a tela de login limpa.
- **Segurança Avançada**: Login por PIN (4 ou 6 dígitos), validação exclusivamente no backend.
- **Privacidade de Dados**: Todas as queries filtradas por `household_id` via middleware. Impossível vazamento entre casas.
- **Responsividade Total**: Layout adaptativo que suporta valores monetários de 10+ dígitos sem quebras.
- **Gestão de Perfil**: Upload e recorte de fotos de perfil com exibição dinâmica na Sidebar.
- Dark mode, glassmorphism e arquitetura Dockerizada.

---

## 🏛️ Hierarquia de Acesso

| Papel | Alcance | Poderes |
|-------|---------|---------|
| `super_admin` | Todo o sistema | Criar/suspender/excluir casas, reset de PIN global, ver todas as casas |
| `admin` | Sua própria casa | Adicionar/inativar membros, resetar PIN, editar perfis da casa |
| `member` | Sua própria casa | Lançar e visualizar dados financeiros da casa |

---

## 📁 Estrutura de Pastas

```
financas-app/
├── docker-compose.yml
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── schema.sql                  ← Schema PostgreSQL v4 (Multi-Tenant)
│   └── src/
│       ├── index.js                ← Entry point Express + auto-migrations
│       ├── db/
│       │   └── pool.js             ← Pool de conexões PG
│       ├── middleware/
│       │   └── household.js        ← Guard de isolamento multi-tenant
│       ├── routes/
│       │   ├── auth.js             ← Login, validação de token, perfis
│       │   ├── households.js       ← CRUD de casas e membros
│       │   ├── dashboard.js        ← Resumo + breakdown
│       │   ├── bills.js            ← Contas a pagar
│       │   ├── cards.js            ← Cartões e compras
│       │   ├── goals.js            ← Metas
│       │   ├── transactions.js     ← Entradas/saídas
│       │   ├── budgets.js          ← Orçamentos
│       │   ├── recurring.js        ← Recorrentes
│       │   ├── categories.js       ← Categorias (global)
│       │   ├── logs.js             ← Logs do sistema
│       │   └── webhooks.js         ← Webhooks (n8n)
│       └── services/
│           └── notifications.js    ← Evolution API (WhatsApp)
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                 ← Router com rotas /admin e /household
        ├── index.css               ← Design system
        ├── api/
        │   └── client.js           ← Fetch wrapper com headers automáticos
        ├── context/
        │   ├── AuthContext.jsx      ← Auth + household binding + roles
        │   ├── SocketContext.jsx
        │   ├── AlertContext.jsx
        │   └── ModalContext.jsx
        ├── components/
        │   ├── Layout.jsx
        │   ├── GlobalUserMenu.jsx  ← Menu flutuante com botões condicionais por role
        │   ├── DeleteConfirmationModal.jsx
        │   └── ...
        └── pages/
            ├── Login.jsx           ← Device Binding + PIN
            ├── AdminPanel.jsx      ← Painel Super Admin
            ├── HouseholdManage.jsx ← Gerenciar Família
            ├── Dashboard.jsx
            ├── Bills.jsx
            ├── CreditCards.jsx
            ├── Goals.jsx
            ├── Budgets.jsx
            ├── Manage.jsx
            └── Docs.jsx
```

---

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19, Vite 6, TailwindCSS 3, HeroUI, Lucide Icons, TanStack Query v5, React Router v7 |
| **Backend** | Node.js 20, Express 4, pg (PostgreSQL driver), Swagger UI |
| **Banco** | PostgreSQL 16 Alpine |
| **Container** | Docker Compose v3.8, Nginx Alpine |
| **PWA** | Manifest + Service Worker |

---

## 🗄 Schema PostgreSQL (v4)

| Tabela | Descrição |
|--------|-----------|
| `households` | Casas/Workspaces com nome, código de convite e status |
| `users` | Membros com role, household_id e soft-delete (is_active) |
| `categories` | Categorias globais (compartilhadas entre casas) |
| `transactions` | Entradas/Saídas isoladas por household_id |
| `bills` | Contas a pagar isoladas por household_id |
| `credit_cards` | Cartões isolados por household_id |
| `card_purchases` | Compras parceladas isoladas por household_id |
| `goals` | Metas isoladas por household_id |
| `budgets` | Orçamentos isolados por household_id |
| `budget_rules` | Regras vinculadas a orçamentos |
| `recurring_transactions` | Gastos fixos isolados por household_id |
| `recurring_exceptions` | Exceções de recorrência |
| `app_logs` | Logs do sistema |

---

## 🔌 Endpoints da API

### Autenticação & Acesso (público)
- `POST /api/auth/validate-token` → `{ invite_token }` — valida código e retorna household
- `GET /api/auth/users?household_id=` → Listar perfis da casa
- `POST /api/auth/login` → `{ identifier, pin }` — retorna user com role e household_id
- `PATCH /api/auth/pin` → `{ user_id, current_pin, new_pin }`
- `GET /api/auth/profile/:id`
- `PATCH /api/auth/profile/:id` → `{ name, email, nickname }`
- `POST /api/auth/profile/:id/avatar` → Multipart form-data

### Households — Super Admin
- `GET /api/households` → Listar todas as casas
- `POST /api/households` → `{ name, admin_name, admin_email, admin_pin }`
- `PATCH /api/households/:id` → `{ name?, status? }`
- `DELETE /api/households/:id` → Excluir casa e todos os dados
- `POST /api/households/:id/reset-pin` → `{ user_id, new_pin }`

### Households — Admin da Casa
- `GET /api/households/:id/members` → Listar membros
- `POST /api/households/:id/members` → `{ name, nickname?, pin? }`
- `PATCH /api/households/:id/members/:uid` → Editar membro
- `PATCH /api/households/:id/members/:uid/toggle` → Ativar/inativar

### Dashboard (protegido)
- `GET /api/dashboard/summary?user_id=&month=YYYY-MM`
- `GET /api/dashboard/breakdown?user_id=&month=YYYY-MM`

### Transações (protegido)
- `GET /api/transactions?user_id=&month=&type=`
- `POST /api/transactions` → Novo lançamento
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Bancos (protegido)
- `GET /api/banks?user_id=`
- `POST /api/banks`
- `PATCH /api/banks/:id`
- `DELETE /api/banks/:id`

### Categorias (global, sem guard)
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

### Contas & Faturas (protegido)
- `GET /api/bills?status=&user_id=`
- `PATCH /api/bills/:id`
- `DELETE /api/bills/:id`

### Cartões (protegido)
- `GET /api/cards?user_id=`
- `POST /api/cards`
- `GET /api/cards/:id/purchases?month=`
- `POST /api/cards/:id/purchases`
- `GET /api/cards/:id/invoice?month=`
- `POST /api/cards/:id/pay-invoice`

### Metas (protegido)
- `GET /api/goals?user_id=`
- `POST /api/goals`
- `PATCH /api/goals/:id/deposit` → `{ amount }`
- `DELETE /api/goals/:id`

### Orçamentos (protegido)
- `GET /api/budgets?user_id=&month=`
- `POST /api/budgets`
- `PATCH /api/budgets/:id`
- `DELETE /api/budgets/:id`

### Recorrentes (protegido)
- `GET /api/recurring?user_id=`
- `POST /api/recurring`
- `PATCH /api/recurring/:id`
- `DELETE /api/recurring/:id`

### Sistema
- `GET /api/health` → Status da API + DB
- `GET /api/logs` → Logs do sistema
- `POST /api/webhooks/faturas` → Webhook externo (n8n)

---

## 🚀 Como Rodar

### Docker (produção)
```bash
docker compose up -d --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

### Dev local (sem Docker)
```bash
# Terminal 1 - Backend
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

### Primeiro acesso
1. Acesse a URL do app
2. Digite o código da casa: `ALVES-X79K`
3. Selecione seu perfil e digite o PIN
