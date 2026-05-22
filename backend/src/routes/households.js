import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/household.js';

const router = Router();

// ─── Helper: gerar invite token ────────────────────────────
function generateToken(name) {
  const prefix = name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'CASA';
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN ROUTES
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/households
 * Lista todas as casas com contagem de membros (super_admin only)
 */
router.get('/', requireRole('super_admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        h.*,
        (SELECT COUNT(*) FROM users u WHERE u.household_id = h.id AND u.is_active = true) as active_users,
        (SELECT COUNT(*) FROM users u WHERE u.household_id = h.id) as total_users,
        COALESCE(m.list, '[]') as members
      FROM households h
      LEFT JOIN (
        SELECT household_id, json_agg(json_build_object(
          'id', id, 
          'name', name, 
          'nickname', nickname, 
          'full_name', full_name,
          'email', email,
          'cpf', cpf,
          'avatar_url', avatar_url,
          'role', role
        )) as list
        FROM users
        GROUP BY household_id
      ) m ON m.household_id = h.id
      ORDER BY h.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error listing households:', err);
    res.status(500).json({ error: 'Erro ao listar casas' });
  }
});

/**
 * POST /api/households
 * Criar nova casa + admin inicial (super_admin only)
 * Body: { name, admin_name, admin_email, admin_pin }
 */
router.post('/', requireRole('super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, admin_name, admin_email, admin_pin } = req.body;

    if (!name || !admin_name || !admin_email) {
      return res.status(400).json({ error: 'Nome da casa, nome e email do admin são obrigatórios' });
    }

    await client.query('BEGIN');

    // 1. Create household
    const invite_token = generateToken(name);
    const { rows: hRows } = await client.query(
      `INSERT INTO households (name, invite_token) VALUES ($1, $2) RETURNING *`,
      [name, invite_token]
    );
    const household = hRows[0];

    // 2. Create admin user
    const { rows: uRows } = await client.query(
      `INSERT INTO users (name, email, nickname, pin, household_id, role)
       VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING id, name, email, nickname, role`,
      [admin_name, admin_email, admin_name, admin_pin || '0000', household.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      household,
      admin: uRows[0],
      invite_token
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating household:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado no sistema' });
    }
    res.status(500).json({ error: 'Erro ao criar casa' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/households/:id
 * Editar casa (nome, status) — super_admin only
 * Body: { name?, status? }
 */
router.patch('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE households SET
        name = COALESCE($1, name),
        status = COALESCE($2, status),
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name, status, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Casa não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error updating household:', err);
    res.status(500).json({ error: 'Erro ao atualizar casa' });
  }
});

/**
 * PATCH /api/households/:id/reset-token
 * Gerar novo invite_token para a casa — super_admin only
 */
router.patch('/:id/reset-token', requireRole('super_admin'), async (req, res) => {
  try {
    const { rows: hRows } = await pool.query('SELECT name FROM households WHERE id = $1', [req.params.id]);
    if (hRows.length === 0) return res.status(404).json({ error: 'Casa não encontrada' });
    
    const newToken = generateToken(hRows[0].name);
    const { rows } = await pool.query(
      'UPDATE households SET invite_token = $1, updated_at = NOW() WHERE id = $2 RETURNING invite_token',
      [newToken, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error resetting token:', err);
    res.status(500).json({ error: 'Erro ao redefinir token' });
  }
});

/**
 * PATCH /api/households/:id/currency
 * Mudar a moeda da casa — admin+ only
 */
router.patch('/:id/currency', requireRole('admin'), async (req, res) => {
  try {
    const targetHousehold = req.userRole === 'super_admin' ? req.params.id : req.householdId;
    const { currency } = req.body;
    if (!currency) return res.status(400).json({ error: 'Moeda é obrigatória' });

    const { rows } = await pool.query(
      'UPDATE households SET currency = $1, updated_at = NOW() WHERE id = $2 RETURNING currency',
      [currency, targetHousehold]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error updating currency:', err);
    res.status(500).json({ error: 'Erro ao atualizar moeda' });
  }
});

/**
 * DELETE /api/households/:id
 * Excluir casa + todos os dados (super_admin only)
 */
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const hId = req.params.id;

    await client.query('BEGIN');

    // Delete in dependency order
    await client.query('DELETE FROM app_logs WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM recurring_exceptions WHERE recurring_id IN (SELECT id FROM recurring_transactions WHERE household_id = $1)', [hId]);
    await client.query('DELETE FROM recurring_transactions WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM card_purchases WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM transactions WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM bills WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM budget_rules WHERE budget_id IN (SELECT id FROM budgets WHERE household_id = $1)', [hId]);
    await client.query('DELETE FROM budgets WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM goals WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM credit_cards WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM banks WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM users WHERE household_id = $1', [hId]);
    await client.query('DELETE FROM households WHERE id = $1', [hId]);

    await client.query('COMMIT');
    res.json({ message: 'Casa e todos os dados removidos permanentemente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting household:', err);
    res.status(500).json({ error: 'Erro ao excluir casa' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/households/:id/reset-pin
 * Forçar reset de PIN de qualquer user (super_admin only)
 * Body: { user_id, new_pin }
 */
router.post('/:id/reset-pin', requireRole('super_admin'), async (req, res) => {
  try {
    const { user_id, new_pin } = req.body;
    if (!user_id || !new_pin) return res.status(400).json({ error: 'user_id e new_pin obrigatórios' });

    const { rows } = await pool.query(
      'UPDATE users SET pin = $1, updated_at = NOW() WHERE id = $2 AND household_id = $3 RETURNING id, name',
      [new_pin, user_id, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado nesta casa' });
    res.json({ message: `PIN de ${rows[0].name} redefinido com sucesso` });
  } catch (err) {
    console.error('❌ Error resetting PIN:', err);
    res.status(500).json({ error: 'Erro ao redefinir PIN' });
  }
});

// ═══════════════════════════════════════════════════════════
//  HOUSE ADMIN ROUTES (admin da casa)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/households/me
 * Detalhes da própria casa (admin+ only)
 */
router.get('/me', requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, invite_token, status, currency, created_at FROM households WHERE id = $1',
      [req.householdId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Casa não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error getting own household:', err);
    res.status(500).json({ error: 'Erro ao buscar dados da casa' });
  }
});

/**
 * GET /api/households/:id/members
 * Listar membros da própria casa
 */
router.get('/:id/members', async (req, res) => {
  try {
    const targetHousehold = req.userRole === 'super_admin' ? req.params.id : req.householdId;

    const { rows } = await pool.query(
      `SELECT id, name, email, nickname, full_name, cpf, avatar_url, role, is_active, created_at 
       FROM users WHERE household_id = $1 AND is_active = true 
       UNION
       SELECT id, name, email, nickname, full_name, cpf, avatar_url, role, is_active, created_at 
       FROM users WHERE household_id = $1 AND is_active = false
       ORDER BY role, name`,
      [targetHousehold]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error listing members:', err);
    res.status(500).json({ error: 'Erro ao listar membros' });
  }
});

/**
 * POST /api/households/:id/members
 * Adicionar membro à casa (admin+ only)
 * Body: { name, email?, nickname?, pin? }
 */
router.post('/:id/members', requireRole('admin'), async (req, res) => {
  try {
    const targetHousehold = req.userRole === 'super_admin' ? req.params.id : req.householdId;
    const { name, email, nickname, pin, full_name, cpf } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const memberEmail = email || `${name.toLowerCase().replace(/\s/g, '.')}@${targetHousehold}.local`;

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, nickname, pin, household_id, role, full_name, cpf)
       VALUES ($1, $2, $3, $4, $5, 'member', $6, $7) RETURNING id, name, email, nickname, role, is_active, full_name, cpf`,
      [name, memberEmail, nickname || name, pin || '0000', targetHousehold, full_name || '', cpf || '']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Error adding member:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

/**
 * PATCH /api/households/:id/members/:uid
 * Editar membro (nome, nickname, pin) — admin+ only
 */
router.patch('/:id/members/:uid', requireRole('admin'), async (req, res) => {
  try {
    const targetHousehold = req.userRole === 'super_admin' ? req.params.id : req.householdId;
    const { name, nickname, pin, full_name, email, cpf } = req.body;

    const { rows } = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        nickname = COALESCE($2, nickname),
        pin = COALESCE($3, pin),
        full_name = COALESCE($4, full_name),
        email = COALESCE($5, email),
        cpf = COALESCE($6, cpf),
        updated_at = NOW()
       WHERE id = $7 AND household_id = $8 RETURNING id, name, nickname, role, is_active, full_name, email, cpf`,
      [name, nickname, pin, full_name, email, cpf, req.params.uid, targetHousehold]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Membro não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error updating member:', err);
    res.status(500).json({ error: 'Erro ao atualizar membro' });
  }
});

/**
 * PATCH /api/households/:id/members/:uid/toggle
 * Ativar/inativar membro (soft delete) — admin+ only
 */
router.patch('/:id/members/:uid/toggle', requireRole('admin'), async (req, res) => {
  try {
    const targetHousehold = req.userRole === 'super_admin' ? req.params.id : req.householdId;

    const { rows } = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND household_id = $2 AND role != 'super_admin'
       RETURNING id, name, is_active`,
      [req.params.uid, targetHousehold]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Membro não encontrado ou protegido' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error toggling member:', err);
    res.status(500).json({ error: 'Erro ao alterar status do membro' });
  }
});

export default router;
