import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/bills?status=pending
 */
router.get('/', async (req, res) => {
  try {
    const { status, user_id } = req.query;

    let query = `SELECT * FROM bills WHERE household_id = $1`;
    const params = [req.householdId];

    if (user_id) {
      params.push(user_id);
      query += ` AND user_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY due_date ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

/**
 * PATCH /api/bills/:id – Atualizar status
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, service_name, amount, due_date, barcode } = req.body;

    const { rows } = await pool.query(
      `UPDATE bills SET 
        status = COALESCE($1, status),
        service_name = COALESCE($2, service_name),
        amount = COALESCE($3, amount),
        due_date = COALESCE($4, due_date),
        barcode = COALESCE($5, barcode),
        updated_at = NOW() 
       WHERE id = $6 AND household_id = $7 RETURNING *`,
      [status, service_name, amount, due_date, barcode, id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Fatura não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar fatura' });
  }
});

/**
 * POST /api/bills – Criar nova fatura/conta
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, service_name, amount, due_date, status, barcode } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO bills (user_id, service_name, amount, due_date, status, barcode, household_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, service_name, amount, due_date, status || 'pending', barcode || null, req.householdId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar fatura' });
  }
});

/**
 * DELETE /api/bills/:id – Apagar fatura
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(`DELETE FROM bills WHERE id = $1 AND household_id = $2`, [id, req.householdId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Fatura não encontrada' });
    res.json({ message: 'Fatura removida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar fatura' });
  }
});

export default router;
