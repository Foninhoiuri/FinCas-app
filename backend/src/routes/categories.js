import { Router } from 'express';
import pool from '../db/pool.js';
import { emit } from '../socket.js';

const router = Router();

/**
 * GET /api/categories
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const householdId = req.householdId;
    
    // Lista categorias da casa específica + globais
    let query = `SELECT * FROM categories WHERE (household_id = $1::uuid OR household_id IS NULL)`;
    const params = [householdId];
    
    if (type) {
      params.push(type);
      query += ` AND type = $2`;
    }
    
    query += ` ORDER BY household_id NULLS FIRST, id`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

/**
 * POST /api/categories – Criar nova categoria
 */
router.post('/', async (req, res) => {
  const { name, icon, color, type } = req.body;
  const householdId = req.householdId;
  try {
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const { rows } = await pool.query(
      `INSERT INTO categories (name, icon, color, type, household_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, icon || 'tag', color || '#6366f1', type || 'expense', householdId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    // Se for erro de chave duplicada (constraint name ou pkey)
    if (err.code === '23505') {
      // 1. Tentar encontrar se já existe pelo nome (para evitar duplicatas lógicas) NA MESMA CASA
      const { rows: existing } = await pool.query(
        'SELECT * FROM categories WHERE name = $1 AND type = $2 AND (household_id = $3 OR household_id IS NULL)', 
        [name, type || 'expense', householdId]
      );
      if (existing.length > 0) return res.status(200).json(existing[0]);

      // 2. Se for erro de PKEY (sequência desatualizada), tentar corrigir a sequência e repetir UMA vez
      if (err.constraint === 'categories_pkey') {
        try {
          await pool.query(`SELECT setval('categories_id_seq', (SELECT max(id) FROM categories))`);
          const { rows: retry } = await pool.query(
            `INSERT INTO categories (name, icon, color, type, household_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, icon || 'tag', color || '#6366f1', type || 'expense', householdId]
          );
          return res.status(201).json(retry[0]);
        } catch (retryErr) {
          console.error('Falha ao repetir insert após fix sequence:', retryErr);
        }
      }
    }
    console.error(err);
    res.status(500).json({ error: `Erro ao criar categoria: ${err.message}` });
  }
});

/**
 * PATCH /api/categories/:id – Editar categoria
 */
router.patch('/:id', async (req, res) => {
  try {
    const { name, icon, color, type } = req.body;

    const { rows } = await pool.query(
      `UPDATE categories SET
         name  = COALESCE($1, name),
         icon  = COALESCE($2, icon),
         color = COALESCE($3, color),
         type  = COALESCE($4, type)
       WHERE id = $5 AND (household_id = $6 OR household_id IS NULL) RETURNING *`,
      [name, icon, color, type, req.params.id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nome já existe' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao editar categoria' });
  }
});

/**
 * DELETE /api/categories/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM categories WHERE id = $1 AND (household_id = $2 OR household_id IS NULL) RETURNING *`,
      [req.params.id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json({ message: 'Categoria removida' });
  } catch (err) {
    // FK constraint – categoria em uso
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Categoria em uso, não pode ser removida' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover categoria' });
  }
});

export default router;
