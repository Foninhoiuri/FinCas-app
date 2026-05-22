# Guia de Operações do Banco de Dados (PostgreSQL) — v4 Multi-Tenant

Este documento centraliza os comandos essenciais para gerenciar, testar, apagar, limpar e editar os dados do PostgreSQL, que roda dentro do Docker no ambiente Proxmox.

> **v4.0:** Todos os dados transacionais agora são isolados por `household_id`. Operações de manutenção devem considerar o escopo da Casa.

---

## 🔌 1. Como Acessar o Banco de Dados

### Via Linha de Comando (psql)
```bash
docker exec -it financas-db psql -U financas_user -d financas_db
```
*Dica: Dentro do psql, use `\dt` para listar tabelas ou `\q` para sair.*

### Via Clientes Visuais (DBeaver, TablePlus, PgAdmin)
- **Host:** `<IP_DO_SEU_PROXMOX_CT>`
- **Porta:** `5432`
- **Database:** `financas_db`
- **Username:** `financas_user`
- **Password:** `financas_password_segura` (a senha configurada no docker-compose.yml)

---

## 🏛️ 2. Estrutura Multi-Tenant

### Hierarquia de dados
```
households (Casas)
├── users (Membros, com role e household_id)
├── banks (Bancos, isolados por household_id)
├── credit_cards → card_purchases → card_installments
├── transactions (Entradas/Saídas)
├── goals (Metas)
├── budgets → budget_rules
├── bills (Contas a pagar)
├── recurring_transactions → recurring_exceptions
└── app_logs
```

### Listar todas as casas
```sql
SELECT id, name, invite_token, status, created_at FROM households ORDER BY created_at;
```

### Listar membros de uma casa
```sql
SELECT id, name, role, is_active, household_id FROM users WHERE household_id = '<UUID_DA_CASA>';
```

### Verificar isolamento — dados por casa
```sql
-- Transações de uma casa específica
SELECT COUNT(*) FROM transactions WHERE household_id = '<UUID_DA_CASA>';

-- Bancos de uma casa específica
SELECT name, balance FROM banks WHERE household_id = '<UUID_DA_CASA>';
```

---

## 🔑 3. Gerenciamento de Tokens (Códigos de Convite)

O `invite_token` é o código que vincula um dispositivo a uma casa. Ele é armazenado na tabela `households` e pode ser alterado diretamente no banco de dados. **Alterar via DB é mais seguro do que pela UI, pois não expõe a operação no frontend.**

### Ver todos os tokens ativos
```sql
SELECT name, invite_token, status, currency FROM households ORDER BY name;
```

### Alterar o token de uma casa (ex: trocar o seu próprio)
```sql
UPDATE households 
SET invite_token = 'IGOR-2026', updated_at = NOW() 
WHERE name = 'Família Alves';
```
> **⚠️ IMPORTANTE:** Após trocar o token, os dispositivos que já estão vinculados continuam funcionando (eles salvam o `household_id`, não o token). Mas novos dispositivos precisarão do novo código.

### Gerar um token aleatório via SQL
```sql
UPDATE households 
SET invite_token = UPPER(CONCAT(
  SUBSTR(REPLACE(name, ' ', ''), 1, 4), '-', 
  SUBSTR(MD5(RANDOM()::TEXT), 1, 4)
)), updated_at = NOW()
WHERE name = 'Família Alves';
```

### Verificar se um token já existe (evitar duplicatas)
```sql
SELECT COUNT(*) FROM households WHERE invite_token = 'NOVO-TOKEN';
-- Se retornar 0, o token está disponível
```

### Revogar acesso de uma casa (sem excluir dados)
Isso não muda o token, mas impede o login de TODOS os membros:
```sql
UPDATE households SET status = 'suspended', updated_at = NOW() WHERE invite_token = 'MATH-992A';
```

### Reativar uma casa suspensa
```sql
UPDATE households SET status = 'active', updated_at = NOW() WHERE invite_token = 'MATH-992A';
```

### Criar uma nova casa manualmente com token personalizado
```sql
INSERT INTO households (name, invite_token, currency) 
VALUES ('Casa do Matheus', 'MATH-2026', 'BRL');
```

---

## 💱 4. Moeda por Casa

Cada casa pode ter sua moeda configurada. O campo `currency` na tabela `households` aceita qualquer código ISO 4217.

### Ver moeda de cada casa
```sql
SELECT name, invite_token, currency FROM households;
```

### Alterar moeda de uma casa
```sql
UPDATE households SET currency = 'USD', updated_at = NOW() WHERE invite_token = 'MATH-992A';
```

### Moedas suportadas
| Código | Moeda | Símbolo | Localidade |
|--------|-------|---------|-----------|
| `BRL` | Real Brasileiro | R$ | pt-BR |
| `USD` | Dólar Americano | $ | en-US |
| `CAD` | Dólar Canadense | CA$ | en-CA |
| `EUR` | Euro | € | de-DE |
| `GBP` | Libra Esterlina | £ | en-GB |

---

## 🧹 3. Limpar Dados e Tabelas

### A) Limpar transações de UMA casa específica
```sql
DELETE FROM transactions WHERE household_id = '<UUID_DA_CASA>';
DELETE FROM recurring_exceptions WHERE recurring_id IN (
  SELECT id FROM recurring_transactions WHERE household_id = '<UUID_DA_CASA>'
);
DELETE FROM recurring_transactions WHERE household_id = '<UUID_DA_CASA>';
```

### B) Limpar TODAS as transações (todas as casas)
```sql
TRUNCATE TABLE transactions, recurring_transactions, recurring_exceptions CASCADE;
```

### C) Excluir uma casa inteira (cascata)
Remove a casa, seus membros e TODOS os dados vinculados.
```sql
-- Ordem de dependência
DELETE FROM app_logs WHERE household_id = '<UUID>';
DELETE FROM recurring_exceptions WHERE recurring_id IN (SELECT id FROM recurring_transactions WHERE household_id = '<UUID>');
DELETE FROM recurring_transactions WHERE household_id = '<UUID>';
DELETE FROM card_purchases WHERE household_id = '<UUID>';
DELETE FROM transactions WHERE household_id = '<UUID>';
DELETE FROM bills WHERE household_id = '<UUID>';
DELETE FROM budget_rules WHERE budget_id IN (SELECT id FROM budgets WHERE household_id = '<UUID>');
DELETE FROM budgets WHERE household_id = '<UUID>';
DELETE FROM goals WHERE household_id = '<UUID>';
DELETE FROM credit_cards WHERE household_id = '<UUID>';
DELETE FROM banks WHERE household_id = '<UUID>';
DELETE FROM users WHERE household_id = '<UUID>';
DELETE FROM households WHERE id = '<UUID>';
```

### D) Reset Completo (TODAS as casas — ⚠️ destrói tudo)
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
*Reinicie o container da API para recriar as tabelas: `docker compose restart api`*

---

## ✍️ 4. Operações Comuns

### Listar usuários com roles
```sql
SELECT u.name, u.role, u.is_active, h.name as casa
FROM users u JOIN households h ON h.id = u.household_id
ORDER BY h.name, u.role;
```

### Mudar PIN de um usuário
```sql
UPDATE users SET pin = '1234' WHERE name = 'Igor';
```

### Promover membro a admin
```sql
UPDATE users SET role = 'admin' WHERE name = 'Flávia';
```

### Suspender uma casa (bloqueia todos os membros)
```sql
UPDATE households SET status = 'suspended', updated_at = NOW() WHERE invite_token = 'ALVES-X79K';
```

### Reativar uma casa
```sql
UPDATE households SET status = 'active', updated_at = NOW() WHERE invite_token = 'ALVES-X79K';
```

### Inativar um membro (soft-delete)
```sql
UPDATE users SET is_active = false WHERE name = 'Demo' AND household_id = '<UUID>';
```

---

## 🧪 5. Inserir Dados de Teste

### Criar nova casa manualmente
```sql
INSERT INTO households (name, invite_token) VALUES ('Casa do Matheus', 'MATH-992A');
```

### Criar usuário vinculado a uma casa
```sql
INSERT INTO users (name, email, nickname, pin, household_id, role) VALUES
('Matheus', 'matheus@email.com', 'Mat', '0000',
 (SELECT id FROM households WHERE invite_token = 'MATH-992A'), 'admin');
```

### Inserir categorias base (globais)
```sql
INSERT INTO categories (name, icon, color) VALUES
('Alimentação', '🍔', '#f59e0b'),
('Moradia', '🏠', '#ec4899'),
('Lazer', '🎮', '#f97316');
```

---

## 🔄 6. Backup e Restauração

### Criar Backup Total
```bash
docker exec -t financas-db pg_dump -U financas_user -d financas_db -c > backup.sql
```

### Restaurar Backup
```bash
cat backup.sql | docker exec -i financas-db psql -U financas_user -d financas_db
```

---

## ⚠️ 7. Resetando o Volume (Docker)

Se o banco "quebrar" ou ficar corrompido, apague o volume para zerá-lo.
**ATENÇÃO: Este passo destrói todos os dados permanentemente.**

```bash
docker compose down
docker volume rm financas-app_pgdata
docker compose up -d
```

A auto-migration no `index.js` recriará todas as tabelas, a casa padrão "Família Alves" e o seed dos usuários iniciais automaticamente.
