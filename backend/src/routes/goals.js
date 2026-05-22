import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/goals?user_id=...
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    const { rows } = await pool.query(
      `SELECT *,
              CASE WHEN target_amount > 0
                   THEN ROUND((current_amount / target_amount) * 100, 1)
                   ELSE 0
              END AS progress
       FROM goals
        WHERE household_id = $1::uuid
          AND (user_id = $2::uuid OR visibility = 'shared')
       ORDER BY created_at DESC`,
      [req.householdId, user_id || null]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

/**
 * POST /api/goals – Criar nova meta
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, title, icon, target_amount, current_amount, deadline, color, visibility } = req.body;
    const finalDeadline = deadline === '' ? null : deadline;

    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, title, icon, target_amount, current_amount, deadline, color, visibility, household_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [user_id, title, icon || 'piggy-bank', target_amount, current_amount || 0, finalDeadline, color || '#10b981', visibility || 'shared', req.householdId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

/**
 * PATCH /api/goals/:id/deposit – Depositar na caixinha
 */
router.patch('/:id/deposit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const { rows } = await pool.query(
      `UPDATE goals
       SET current_amount = current_amount + $1, updated_at = NOW()
       WHERE id = $2 AND household_id = $3
       RETURNING *,
         CASE WHEN target_amount > 0
              THEN ROUND((current_amount / target_amount) * 100, 1)
              ELSE 0
         END AS progress`,
      [amount, id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Meta não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao depositar' });
  }
});

/**
 * PATCH /api/goals/:id – Editar meta
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, icon, target_amount, current_amount, deadline, color, visibility } = req.body;
    const finalDeadline = deadline === '' ? null : deadline;

    const { rows } = await pool.query(
      `UPDATE goals SET
         title          = COALESCE($1, title),
         icon           = COALESCE($2, icon),
         target_amount  = COALESCE($3, target_amount),
         current_amount = COALESCE($4, current_amount),
         deadline       = $5,
         color          = COALESCE($6, color),
         visibility     = COALESCE($7, visibility),
         updated_at     = NOW()
       WHERE id = $8 AND household_id = $9 RETURNING *`,
      [title, icon, target_amount, current_amount, finalDeadline, color, visibility, id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Meta não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

/**
 * DELETE /api/goals/:id – Apagar meta
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(`DELETE FROM goals WHERE id = $1 AND household_id = $2`, [id, req.householdId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Meta não encontrada' });
    res.json({ message: 'Meta removida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar meta' });
  }
});

export default router;
