# FinCas — Gestão financeira doméstica multi-tenant

Controle financeiro organizado por **Casas** (*households*): contas, cartões de
crédito, faturas, orçamentos e metas — com isolamento absoluto de dados entre
casas, múltiplas moedas e papéis de acesso.

> v3.0 — International Multi-Tenant. Arquitetura dockerizada, dark mode e
> glassmorphism. Visão detalhada em [project_overview.md](project_overview.md).

## Como rodar

```bash
cp backend/.env.example backend/.env   # e preencha
docker compose up -d --build
```

Sobe quatro serviços: `financas-db` (PostgreSQL 16), `financas-backend`,
`financas-frontend` e `financas-logs` ([Dozzle](https://dozzle.dev/), visualizador
de logs dos containers).

## Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env`. **Nunca commite o `.env`** — em
produção, configure na Stack do Portainer.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | **String de conexão do PostgreSQL** (contém a senha) |
| `PORT` | Porta do backend |
| `NODE_ENV` | `development` ou `production` |

## Hierarquia de acesso

| Papel | Alcance | Poderes |
|---|---|---|
| `super_admin` | Todo o sistema | Criar/suspender/excluir casas, reset de PIN global, ver todas as casas |
| `admin` | A própria casa | Adicionar/inativar membros, resetar PIN, editar perfis da casa |
| `member` | A própria casa | Lançar e consultar dentro do seu escopo |

**Device binding:** cada dispositivo é amarrado a uma Casa por código de convite,
o que mantém a tela de login limpa — o usuário só informa o PIN.

**Login por PIN** (4 ou 6 dígitos), validado **exclusivamente no backend**.

## Isolamento de dados

Todas as queries são filtradas por `household_id` num middleware, não em cada
rota. É o ponto mais importante da arquitetura: o isolamento não depende de o
desenvolvedor lembrar de filtrar — vazamento entre casas é impossível por
construção. Qualquer rota nova herda o filtro automaticamente.

## Telas

| Tela | Descrição |
|---|---|
| `Login` · `Setup` | Entrada por PIN e configuração inicial |
| `Dashboard` | Visão geral: saldos, evolução e resumo do mês |
| `Bills` | Contas e despesas |
| `CreditCards` | Cartões, compras e **faturas** |
| `Budgets` | Orçamentos por categoria |
| `Goals` | Metas financeiras |
| `Manage` · `HouseholdManage` | Gestão da casa e dos membros |
| `AdminPanel` | Área do `super_admin` |
| `EditProfile` | Perfil, com upload e **recorte** de foto |
| `Docs` | Documentação embutida |

## API

Rotas REST agrupadas por recurso, com **Swagger** disponível em `/api-docs.json`
e health check em `/api/health`. Destaques: `/summary`, `/breakdown`,
`/evolution` (agregações do dashboard), `/month/:month`, `/:id/invoice` (fatura do
cartão), `/:id/members` e `/api/setup/status`.

Atualizações em tempo real via **Socket.IO**.

## Stack

**Backend:** Node.js · Express · PostgreSQL (`pg`) · Socket.IO · Helmet ·
Morgan · Multer + Sharp (upload e processamento de imagem) · swagger-jsdoc
**Frontend:** React · Vite · **HeroUI** · TanStack Query · React Router ·
Recharts · Framer Motion · react-easy-crop · date-fns · Socket.IO client
**Infra:** Docker Compose · PostgreSQL 16 · Dozzle

## Estrutura

```
backend/
  src/
    index.js        # bootstrap
    routes/         # rotas por recurso
    middleware/     # auth + filtro household_id
    services/       # regras de negócio
    db/             # acesso ao PostgreSQL
    socket.js       # tempo real
    swagger.js      # documentação da API
  uploads/          # fotos de perfil  (NÃO versionado)
frontend/
  src/pages/        # uma tela por rota
docker-compose.yml  # db + backend + frontend + dozzle
```

## Banco de dados

PostgreSQL 16 em container, dados no volume `pgdata` — fora da pasta do projeto
e do Git. Para backup e restauração:

```bash
docker exec financas-db pg_dump -U postgres -d financas > financas-backup.sql
```

O dump contém **dados financeiros reais**. Nunca versionar.

## Deploy (Portainer)

**Pré-requisito, uma vez por servidor:** a rede compartilhada precisa existir
antes de qualquer stack, senão o deploy falha com
`network proxy declared as external, but could not be found`.

```bash
docker network create proxy
```

No Portainer: **Stacks → Add stack → Repository**, apontando para este
repositório. Preencha as variáveis marcadas como OBRIGATÓRIAS no `.env.example`
em **Environment variables** — elas não têm valor padrão, e sem elas o serviço
que as usa não sobe.

### Publicar na internet

O acesso externo é feito por **Cloudflare Tunnel** (o servidor está atrás de
CGNAT, sem IP público). No painel do túnel, crie um **Public Hostname** para
este app apontando para o IP do host e a porta publicada:

```
http://IP-DO-HOST:PORTA
```

A porta é a definida em `APP_PORT` (ou `FRONTEND_PORT`) nas variáveis da
stack. Se você não definir, vale o padrão do compose — que provavelmente não
é o que você espera.

> Como o túnel entrega direto no app, a porta fica publicada em `0.0.0.0`:
> quem está na sua rede local alcança o app pelo IP, sem passar pela
> Cloudflare. Para um app que precise ficar acessível **só** pelo túnel, ele
> não pode publicar porta — precisaria de um proxy reverso na frente.

## Segurança

- `backend/.env` (com a `DATABASE_URL`) e `backend/uploads/` (fotos reais de
  usuários) estão no `.gitignore`.
- PINs são validados só no backend — o front nunca decide autenticação.
- O filtro por `household_id` no middleware é a garantia de isolamento; qualquer
  consulta que o contorne quebra o modelo de privacidade.
- `Arquivos anexados/` e `scratch/` são material de trabalho local, fora do Git.

Regras completas em [CLAUDE.md](CLAUDE.md).

## Próximos passos

- Primeiro acesso solicitar a criação do `super_admin`, eliminando credenciais de seed
- Rotina de backup automatizada do volume `pgdata`
- Testes cobrindo o isolamento por `household_id`
