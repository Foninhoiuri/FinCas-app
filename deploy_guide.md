# 🖥️ Finanças App — Guia de Deploy & Operações (Proxmox CT)

> Documento operacional para rodar, atualizar e manter o app dentro de um **Container LXC no Proxmox**.

---

## 📋 Pré-requisitos do CT

| Recurso | Mínimo Recomendado |
|---------|--------------------|
| **OS** | Debian 12 / Ubuntu 22.04 |
| **vCPU** | 2 cores |
| **RAM** | 1 GB |
| **Disco** | 8 GB |
| **Rede** | Bridge com IP fixo |

### Instalar dependências no CT

```bash
apt update && apt upgrade -y
apt install -y curl git
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

---

## 📁 Estrutura de Diretórios

```
/opt/financas-app/
├── docker-compose.yml
├── .env
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── schema.sql
│   ├── uploads/avatars/      ← Fotos de perfil
│   └── src/
│       ├── index.js           ← Express + HTTP + Socket.IO
│       ├── swagger.js         ← Swagger UI config
│       ├── socket.js          ← WebSocket real-time
│       ├── db/pool.js
│       └── routes/
│           ├── auth.js         ← Login + perfil + avatar upload
│           ├── banks.js        ← CRUD de bancos
│           ├── categories.js   ← CRUD de categorias
│           ├── transactions.js ← CRUD + real-time
│           ├── logs.js         ← Sistema de logs via API
│           ├── bills.js / cards.js / goals.js
│           ├── dashboard.js / webhooks.js
└── frontend/
    ├── public/sw.js            ← Service Worker (cache + offline)
    └── src/
        ├── api/client.js
        ├── context/
        │   ├── AuthContext.jsx  ← Auth + validação sessão
        │   └── SocketContext.jsx ← WebSocket real-time
        └── pages/
            ├── Login.jsx        ← PIN pad + validação DB
            ├── Profile.jsx      ← Config + troca PIN
            ├── EditProfile.jsx  ← Editar perfil + foto
            ├── Manage.jsx       ← CRUD bancos/categorias
            └── Docs.jsx         ← Link para Swagger UI
```

---

## 🚀 Primeiro Deploy

```bash
cd /opt
git clone <SEU_REPO_URL> financas-app
cd /opt/financas-app
docker compose up -d --build
docker compose ps
```

---

## 🔧 Comandos do Dia a Dia

```bash
cd /opt/financas-app

# Iniciar
docker compose up -d

# Parar
docker compose down

# Reiniciar tudo
docker compose restart

# Reiniciar serviço específico
docker compose restart backend
docker compose restart frontend
docker compose restart db

# Logs (follow)
docker compose logs -f --tail 50 backend
```

---

## 🔄 Atualizar o App

```bash
cd /opt/financas-app
git pull origin main
docker compose up -d --build
docker compose logs -f --tail 20 backend
```

### Atualizar só frontend ou backend

```bash
docker compose build frontend && docker compose up -d frontend
docker compose build backend && docker compose up -d backend
```

---

## 🗄️ Banco de Dados

### Acessar PostgreSQL

```bash
docker exec -it financas-db psql -U financas_user -d financas_db
```

### Queries úteis

```sql
SELECT * FROM users;
UPDATE users SET pin = '9999' WHERE name = 'Igor';
SELECT * FROM banks ORDER BY name;
SELECT * FROM categories ORDER BY id;
SELECT * FROM app_logs WHERE level = 'error' ORDER BY created_at DESC LIMIT 20;
DELETE FROM app_logs WHERE created_at < NOW() - INTERVAL '30 days';
```

### Backup / Restore

```bash
docker compose exec db pg_dump -U financas_user financas_db > /opt/backups/financas_$(date +%Y%m%d).sql
cat /opt/backups/financas.sql | docker compose exec -T db psql -U financas_user -d financas_db
```

### Resetar banco

```bash
docker compose down -v
docker compose up -d --build
```

---

## 🔐 Autenticação

1. Login: seleciona perfil + PIN 4 dígitos → validado no DB
2. Sessão: salva no `localStorage` do navegador
3. Cada página valida sessão via `GET /api/auth/profile/:id`
   - **200** → OK | **401/404** → logout | **500/rede** → mantém (offline)
4. PIN offline: Igor=1234, Flávia=5678 (só quando API offline)
5. Troca de PIN: Perfil → Alterar PIN (via API) ou SQL direto

---

## 📖 Swagger UI

Documentação interativa da API com Try It Out para testar endpoints.

```
http://IP_DO_CT:3001/api-docs         ← Interface visual
http://IP_DO_CT:3001/api-docs.json    ← Spec JSON (OpenAPI 3.0)
```

Todos os endpoints estão documentados: Auth, Banks, Categories, Transactions, Bills, Cards, Goals, Logs, Dashboard e Webhooks.

---

## 🔌 WebSocket (Real-time)

Socket.IO sincroniza dados em tempo real entre dispositivos.

- **Servidor**: `ws://IP_DO_CT:3001/ws`
- **Eventos emitidos**: `transaction:created`, `transaction:deleted`, `user:updated`, `bank:updated`, `category:updated`
- Igor adiciona gasto → aparece instantaneamente na tela de Flávia
- Status de conexão visível na página de Docs

---

## 📴 Service Worker (Offline)

O app funciona offline com cache inteligente:

| Tipo | Estratégia | O que cacheia |
|------|-----------|---------------|
| App Shell | Install-time | index.html |
| Assets | Cache First | JS, CSS, fontes, imagens |
| APIs (GET) | Stale-While-Revalidate | Respostas JSON |
| Mutations (POST/PATCH/DELETE) | Offline Queue | Salva no IndexedDB, reenvia ao reconectar |

Quando a conexão volta, mutations pendentes são reenviadas automaticamente e os caches do React Query são invalidados.

---

## 👤 Editar Perfil

- **Via app**: Perfil → Editar perfil
- Editar: nome, e-mail, apelido
- Upload de foto: selecionar do celular/PC, recortar circular, salva em 256x256 JPEG
- Fotos salvas em `/opt/financas-app/backend/uploads/avatars/`

## 📊 Logs via API

```bash
# Listar erros
curl "http://IP:3001/api/logs?level=error&limit=10"

# Registrar log
curl -X POST http://IP:3001/api/logs \
  -H "Content-Type: application/json" \
  -d '{"level":"info","source":"manual","message":"Teste"}'

# Limpar logs > 30 dias
curl -X DELETE "http://IP:3001/api/logs?days=30"
```

---

## 🔌 API Completa

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/auth/users` | Lista perfis |
| `POST` | `/api/auth/login` | Login PIN |
| `PATCH` | `/api/auth/pin` | Alterar PIN |
| `GET` | `/api/auth/profile/:id` | Validar sessão |
| `GET/POST/PATCH/DELETE` | `/api/banks` | CRUD bancos |
| `GET/POST/PATCH/DELETE` | `/api/categories` | CRUD categorias |
| `GET/POST/DELETE` | `/api/transactions` | Transações |
| `GET/PATCH` | `/api/bills` | Faturas |
| `GET` | `/api/cards` | Cartões |
| `POST` | `/api/cards/:id/purchases` | Compras |
| `GET/POST/PATCH` | `/api/goals` | Metas |
| `GET/POST/DELETE` | `/api/logs` | Logs do sistema |
| `POST` | `/api/webhooks/faturas` | Webhook n8n |

---

## 🔁 Auto-start no boot

```bash
systemctl enable docker

cat > /etc/systemd/system/financas-app.service << 'EOF'
[Unit]
Description=Finanças App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/financas-app
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable financas-app
systemctl start financas-app
```

---

## 🛠️ Troubleshooting

```bash
# Backend não sobe
docker compose logs backend

# Testar conexão do banco
docker compose exec db pg_isready -U financas_user -d financas_db

# Login não funciona
curl http://localhost:3001/api/health
docker exec -it financas-db psql -U financas_user -d financas_db -c "SELECT id, name, pin FROM users;"
curl "http://localhost:3001/api/logs?level=error&limit=5"

# Rebuild completo
docker compose down -v --rmi all
docker compose up -d --build
```

---

## 📊 Monitoramento

```bash
docker stats --no-stream
docker system df
docker system prune -af
```


Passo 2: Rodar pelo Terminal na Unidade Z:
Abra o PowerShell e entre pela letra da unidade:

```bash
z:
cd financas-app/frontend
npm run dev
```
Passo 3: Rodar o Backend
Para que o frontend consiga conversar com o banco, o backend também precisa estar rodando localmente (fora do Docker):

Em outro terminal:
```bash
z:
cd financas-app/backend
npm start
```