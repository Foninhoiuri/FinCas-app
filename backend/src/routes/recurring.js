import { Router } from 'express';
import pool from '../db/pool.js';
import { emit } from '../socket.js';

const router = Router();

// Helper para garantir que IDs vazios virem NULL no banco
const toId = (val) => (val === "" || val === undefined || val === "null" || val === null) ? null : val;

/**
 * GET /api/recurring?user_id=...
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = `
      SELECT r.*, c.name AS category_name, c.color AS category_color,
             b.name AS bank_name, b.color AS bank_color
      FROM recurring_transactions r
      LEFT JOIN categories c ON c.id = r.category_id
      LEFT JOIN banks b ON b.id = r.bank_id
      WHERE r.household_id = $1 AND r.active = true`;
    const params = [req.householdId];

    if (user_id) {
      params.push(user_id);
      query += ` AND (r.visibility = 'shared' OR r.user_id = $${params.length})`;
    }

    query += ` ORDER BY r.type, r.description`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar recorrentes' });
  }
});

/**
 * POST /api/recurring – Criar gasto/entrada fixo
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, category_id, bank_id, type, description, amount, payment_method, visibility, day_of_month, start_month, time, goal_id } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: 'description e amount obrigatórios' });
    }

    const { rows } = await pool.query(
      `INSERT INTO recurring_transactions
        (user_id, category_id, bank_id, type, description, amount, payment_method, visibility, day_of_month, start_month, time, goal_id, household_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [user_id, toId(category_id), toId(bank_id), type || 'expense', description, amount,
       payment_method || 'pix', visibility || 'shared', day_of_month || 1,
       start_month || new Date().toISOString().slice(0, 7), time || '00:00:00', toId(goal_id), req.householdId]
    );

    emit('recurring:updated', rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar recorrente' });
  }
});

/**
 * PATCH /api/recurring/:id – Editar recorrente
 */
router.patch('/:id', async (req, res) => {
  try {
    const { description, amount, category_id, bank_id, payment_method, day_of_month, visibility, time, goal_id } = req.body;

    const { rows } = await pool.query(
      `UPDATE recurring_transactions SET
         description    = COALESCE($1, description),
         amount         = COALESCE($2, amount),
         category_id    = COALESCE($3, category_id),
         bank_id        = COALESCE($4, bank_id),
         payment_method = COALESCE($5, payment_method),
         day_of_month   = COALESCE($6, day_of_month),
         visibility     = COALESCE($7, visibility),
         time           = COALESCE($8, time),
         goal_id        = COALESCE($9, goal_id)
       WHERE id = $10 AND household_id = $11 RETURNING *`,
      [description, amount, toId(category_id), toId(bank_id), payment_method, day_of_month, visibility, time, toId(goal_id), req.params.id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Recorrente não encontrado' });

    emit('recurring:updated', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao editar recorrente' });
  }
});

/**
 * DELETE /api/recurring/:id?scope=all|from_month&month=YYYY-MM
 * scope=all → desativa permanentemente
 * scope=this → exclui apenas o mês especificado
 * scope=future → desativa a partir do mês especificado
 */
router.delete('/:id', async (req, res) => {
  try {
    const { scope, month } = req.query;
    const id = req.params.id;

    if (scope === 'all') {
      await pool.query(`UPDATE recurring_transactions SET active = false WHERE id = $1 AND household_id = $2`, [id, req.householdId]);
      emit('recurring:updated', { id, action: 'deactivated' });
      return res.json({ message: 'Recorrente desativado permanentemente' });
    }

    if (scope === 'this' && month) {
      await pool.query(
        `INSERT INTO recurring_exceptions (recurring_id, excluded_month) VALUES ($1, $2)
         ON CONFLICT (recurring_id, excluded_month) DO NOTHING`,
        [id, month]
      );
      emit('recurring:updated', { id, action: 'excluded_month', month });
      return res.json({ message: `Excluído para ${month}` });
    }

    if (scope === 'future' && month) {
      await pool.query(
        `UPDATE recurring_transactions SET end_month = $1 WHERE id = $2 AND household_id = $3`,
        [month, id, req.householdId]
      );
      emit('recurring:updated', { id, action: 'ended_at', month });
      return res.json({ message: `Encerrado a partir de ${month}` });
    }

    return res.status(400).json({ error: 'Especifique scope=all|this|future e month=YYYY-MM' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover recorrente' });
  }
});

/**
 * GET /api/recurring/month/:month – Retorna os recorrentes ativos para um mês
 * Inclui recorrentes ativos cujo start_month <= month e (end_month >= month ou null)
 * Exclui os que têm exceção para esse mês
 */
router.get('/month/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const { user_id } = req.query;

    let query = `
      SELECT r.*, c.name AS category_name, c.color AS category_color,
             b.name AS bank_name, b.color AS bank_color,
             re.custom_amount
      FROM recurring_transactions r
      LEFT JOIN categories c ON c.id = r.category_id
      LEFT JOIN banks b ON b.id = r.bank_id
      LEFT JOIN recurring_exceptions re ON re.recurring_id = r.id AND re.excluded_month = $1
      WHERE r.household_id = $2 AND r.active = true
        AND r.start_month <= $1
        AND (r.end_month IS NULL OR r.end_month >= $1)
        AND re.id IS NULL`;
    const params = [month, req.householdId];

    if (user_id) {
      params.push(user_id);
      query += ` AND (r.visibility = 'shared' OR r.user_id = $${params.length})`;
    }

    query += ` ORDER BY r.type, r.description`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar recorrentes do mês' });
  }
});

export default router;
