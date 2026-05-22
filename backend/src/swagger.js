import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FinCas API',
      version: '4.0.0',
      description: 'API do sistema financeiro multi-tenant FinCas. Todas as rotas protegidas requerem os headers X-Household-Id e X-User-Id.',
    },
    servers: [{ url: '/api', description: 'API Server' }],
    tags: [
      { name: 'Auth', description: 'Autenticação, validação de token e perfis (público)' },
      { name: 'Households', description: 'Gestão de casas e membros (protegido por role)' },
      { name: 'Banks', description: 'Contas bancárias (protegido por household)' },
      { name: 'Categories', description: 'Categorias de gastos (global)' },
      { name: 'Transactions', description: 'Transações financeiras (protegido por household)' },
      { name: 'Recurring', description: 'Transações recorrentes (protegido por household)' },
      { name: 'Budgets', description: 'Orçamentos e limites (protegido por household)' },
      { name: 'Bills', description: 'Contas a pagar (protegido por household)' },
      { name: 'Cards', description: 'Cartões de crédito e faturas (protegido por household)' },
      { name: 'Goals', description: 'Metas e caixinhas (protegido por household)' },
      { name: 'Logs', description: 'Auditoria e logs do sistema' },
      { name: 'Dashboard', description: 'Inteligência e resumos (protegido por household)' },
    ],
    components: {
      parameters: {
        HouseholdHeader: {
          name: 'X-Household-Id', in: 'header', required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'ID da casa para isolamento multi-tenant',
        },
        UserHeader: {
          name: 'X-User-Id', in: 'header', required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'ID do usuário autenticado',
        },
      },
    },
    paths: {
      // ─── Auth (público) ─────────────────────────────────
      '/auth/validate-token': {
        post: {
          tags: ['Auth'], summary: 'Validar código de convite da casa',
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['invite_token'],
            properties: { invite_token: { type: 'string', example: 'ALVES-X79K' } },
          } } } },
          responses: {
            200: { description: 'Token válido — retorna household_id e nome' },
            404: { description: 'Código inválido' },
            403: { description: 'Casa suspensa' },
          },
        },
      },
      '/auth/users': {
        get: {
          tags: ['Auth'], summary: 'Listar perfis de uma casa',
          parameters: [{ name: 'household_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Lista de usuários ativos da casa' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login por PIN',
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['identifier', 'pin'],
            properties: {
              identifier: { type: 'string', description: 'ID ou Nome do usuário' },
              pin: { type: 'string', minLength: 4, maxLength: 6 },
            },
          } } } },
          responses: {
            200: { description: 'Login OK — retorna user com role e household_id' },
            401: { description: 'PIN incorreto' },
            403: { description: 'Usuário inativo ou casa suspensa' },
          },
        },
      },
      '/auth/pin': {
        patch: {
          tags: ['Auth'], summary: 'Alterar PIN',
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['user_id', 'current_pin', 'new_pin'],
            properties: { user_id: { type: 'string', format: 'uuid' }, current_pin: { type: 'string' }, new_pin: { type: 'string' } },
          } } } },
          responses: { 200: { description: 'PIN alterado' } },
        },
      },

      // ─── Households (super_admin) ──────────────────────
      '/households': {
        get: {
          tags: ['Households'], summary: 'Listar todas as casas (super_admin)',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          responses: { 200: { description: 'Lista de casas com contagem de usuários' } },
        },
        post: {
          tags: ['Households'], summary: 'Criar nova casa + admin (super_admin)',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['name', 'admin_name', 'admin_email'],
            properties: {
              name: { type: 'string', example: 'Casa do Matheus' },
              admin_name: { type: 'string', example: 'Matheus' },
              admin_email: { type: 'string', example: 'matheus@email.com' },
              admin_pin: { type: 'string', example: '0000', default: '0000' },
            },
          } } } },
          responses: { 201: { description: 'Casa criada com invite_token gerado' } },
        },
      },
      '/households/{id}': {
        patch: {
          tags: ['Households'], summary: 'Editar casa (super_admin)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object',
            properties: { name: { type: 'string' }, status: { type: 'string', enum: ['active', 'suspended'] } },
          } } } },
          responses: { 200: { description: 'Casa atualizada' } },
        },
        delete: {
          tags: ['Households'], summary: 'Excluir casa e todos os dados (super_admin)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Casa e dados removidos permanentemente' } },
        },
      },
      '/households/{id}/reset-pin': {
        post: {
          tags: ['Households'], summary: 'Forçar reset de PIN (super_admin)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['user_id', 'new_pin'],
            properties: { user_id: { type: 'string', format: 'uuid' }, new_pin: { type: 'string' } },
          } } } },
          responses: { 200: { description: 'PIN redefinido' } },
        },
      },
      '/households/{id}/members': {
        get: {
          tags: ['Households'], summary: 'Listar membros da casa (admin)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Lista de membros' } },
        },
        post: {
          tags: ['Households'], summary: 'Adicionar membro (admin)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['name'],
            properties: { name: { type: 'string' }, nickname: { type: 'string' }, pin: { type: 'string', default: '0000' } },
          } } } },
          responses: { 201: { description: 'Membro adicionado' } },
        },
      },
      '/households/{id}/members/{uid}': {
        patch: {
          tags: ['Households'], summary: 'Editar membro (admin)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'uid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object',
            properties: { name: { type: 'string' }, nickname: { type: 'string' }, pin: { type: 'string' } },
          } } } },
          responses: { 200: { description: 'Membro atualizado' } },
        },
      },
      '/households/{id}/members/{uid}/toggle': {
        patch: {
          tags: ['Households'], summary: 'Ativar/Inativar membro (admin)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'uid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Status alterado' } },
        },
      },

      // ─── Banks ───────────────────────────────────────────
      '/banks': {
        get: {
          tags: ['Banks'], summary: 'Listar bancos',
          parameters: [
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Lista de bancos' } },
        },
        post: {
          tags: ['Banks'], summary: 'Criar banco',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['name'],
            properties: { user_id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, icon: { type: 'string' }, color: { type: 'string' }, is_shared: { type: 'boolean' } },
          } } } },
          responses: { 201: { description: 'Banco criado' } },
        },
      },

      // ─── Transactions ────────────────────────────────────
      '/transactions': {
        get: {
          tags: ['Transactions'], summary: 'Listar transações',
          parameters: [
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'month', in: 'query', schema: { type: 'string' }, description: 'YYYY-MM' },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Lista de transações' } },
        },
        post: {
          tags: ['Transactions'], summary: 'Criar transação',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['description', 'amount', 'user_id'],
            properties: {
              user_id: { type: 'string', format: 'uuid' }, type: { type: 'string', enum: ['income', 'expense'] },
              description: { type: 'string' }, amount: { type: 'number' },
              category_id: { type: 'integer' }, bank_id: { type: 'integer' },
              payment_method: { type: 'string', enum: ['pix', 'debit', 'credit', 'cash'] },
              visibility: { type: 'string', enum: ['shared', 'personal'] },
              date: { type: 'string', format: 'date' },
            },
          } } } },
          responses: { 201: { description: 'Transação criada' } },
        },
      },
      '/transactions/{id}': {
        patch: {
          tags: ['Transactions'], summary: 'Editar transação',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Atualizada' } },
        },
        delete: {
          tags: ['Transactions'], summary: 'Remover transação',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Removida' } },
        },
      },

      // ─── Budgets ─────────────────────────────────────────
      '/budgets': {
        get: {
          tags: ['Budgets'], summary: 'Listar orçamentos',
          parameters: [
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'month', in: 'query', schema: { type: 'string' }, description: 'YYYY-MM' },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Lista de orçamentos' } },
        },
        post: {
          tags: ['Budgets'], summary: 'Criar orçamento',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object', required: ['title', 'budget_limit'],
            properties: {
              title: { type: 'string' }, budget_limit: { type: 'number' },
              icon: { type: 'string' }, color: { type: 'string' },
              rules: { type: 'array', items: { type: 'object' } },
            },
          } } } },
          responses: { 201: { description: 'Orçamento criado' } },
        },
      },

      // ─── Recurring ───────────────────────────────────────
      '/recurring': {
        get: {
          tags: ['Recurring'], summary: 'Listar recorrências',
          parameters: [
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Lista' } },
        },
        post: {
          tags: ['Recurring'], summary: 'Criar recorrência',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['description', 'amount', 'day_of_month'] } } } },
          responses: { 201: { description: 'Criada' } },
        },
      },

      // ─── Goals ───────────────────────────────────────────
      '/goals': {
        get: {
          tags: ['Goals'], summary: 'Listar metas',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          responses: { 200: { description: 'Lista' } },
        },
        post: {
          tags: ['Goals'], summary: 'Criar meta',
          parameters: [{ $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' }],
          responses: { 201: { description: 'Criada' } },
        },
      },
      '/goals/{id}/deposit': {
        patch: {
          tags: ['Goals'], summary: 'Aporte em meta',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' } } } } } },
          responses: { 200: { description: 'Aporte realizado' } },
        },
      },

      // ─── Dashboard ───────────────────────────────────────
      '/dashboard/summary': {
        get: {
          tags: ['Dashboard'], summary: 'Resumo mensal',
          parameters: [
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'month', in: 'query', schema: { type: 'string' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Resumo com entradas, saídas e saldo' } },
        },
      },
      '/dashboard/breakdown': {
        get: {
          tags: ['Dashboard'], summary: 'Breakdown por categoria',
          parameters: [
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'month', in: 'query', schema: { type: 'string' } },
            { $ref: '#/components/parameters/HouseholdHeader' }, { $ref: '#/components/parameters/UserHeader' },
          ],
          responses: { 200: { description: 'Lista de categorias com totais' } },
        },
      },

      // ─── Health ──────────────────────────────────────────
      '/health': {
        get: {
          tags: ['System'], summary: 'Status da API e banco',
          responses: { 200: { description: 'OK' } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { display: none; }
      body { background: #0f172a; }
      .swagger-ui { font-family: 'Inter', system-ui, sans-serif; filter: invert(0.9) hue-rotate(180deg); }
      .swagger-ui .info .title, .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table { color: #000; }
    `,
    customSiteTitle: 'FinCas API v4.0',
    swaggerOptions: { persistAuthorization: true, tryItOutEnabled: true },
  }));

  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}
