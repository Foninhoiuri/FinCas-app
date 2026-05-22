import { Router } from 'express';
import pool from '../db/pool.js';
import { emit } from '../socket.js';

const router = Router();

/**
 * GET /api/banks/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM banks WHERE id = $1 AND household_id = $2', [id, req.householdId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Banco não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar banco' });
  }
});

/**
 * GET /api/banks?user_id=...
 * Lista bancos do usuário + compartilhados (dentro da mesma casa)
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    const householdId = req.householdId; // Injetado pelo guard

    const { rows } = await pool.query(
      `SELECT * FROM banks
       WHERE household_id = $1::uuid
       AND (user_id = $2::uuid OR is_shared = TRUE)
       ORDER BY is_shared DESC, name`,
      [householdId, user_id || null]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar bancos' });
  }
});

/**
 * POST /api/banks – Criar novo banco
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, name, icon, color, is_shared, balance } = req.body;
    const householdId = req.householdId;

    const { rows } = await pool.query(
      `INSERT INTO banks (user_id, name, icon, color, is_shared, household_id, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, name, icon || 'landmark', color || '#6366f1', is_shared ?? true, householdId, balance || 0]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Erro ao criar banco: ${err.message}` });
  }
});

/**
 * PATCH /api/banks/:id – Editar banco
 */
router.patch('/:id', async (req, res) => {
  try {
    const { name, icon, color, is_shared, balance } = req.body;

    const { rows } = await pool.query(
      `UPDATE banks SET
         name = COALESCE($1, name),
         icon = COALESCE($2, icon),
         color = COALESCE($3, color),
         is_shared = COALESCE($4, is_shared),
         balance = COALESCE($5, balance)
       WHERE id = $6 AND household_id = $7 RETURNING *`,
      [name, icon, color, is_shared, balance, req.params.id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Banco não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Erro ao editar banco: ${err.message}` });
  }
});

/**
 * DELETE /api/banks/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM banks WHERE id = $1 AND household_id = $2 RETURNING *`,
      [req.params.id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Banco não encontrado' });
    res.json({ message: 'Banco removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover banco' });
  }
});

export default router;
