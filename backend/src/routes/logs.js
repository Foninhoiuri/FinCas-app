import { Router } from 'express';
import pool from '../db/pool.js';
import { notifyError } from '../services/notifications.js';

const router = Router();

/**
 * GET /api/logs?level=error&limit=50
 * Listar logs da aplicação
 */
router.get('/', async (req, res) => {
  try {
    const { level, limit, source } = req.query;

    let query = `SELECT * FROM app_logs WHERE 1=1`;
    const params = [];

    if (level) {
      params.push(level);
      query += ` AND level = $${params.length}`;
    }
    if (source) {
      params.push(source);
      query += ` AND source = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    params.push(parseInt(limit) || 100);
    query += ` LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar logs' });
  }
});

/**
 * POST /api/logs – Registrar novo log
 * Body: { level, source, message, details, user_id }
 */
router.post('/', async (req, res) => {
  try {
    const { level, source, message, details, user_id } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO app_logs (level, source, message, details, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [level || 'info', source || 'app', message, details ? JSON.stringify(details) : null, user_id || null]
    );

    const log = rows[0];

    // Se for erro, notifica via webhook/whatsapp
    if (level === 'error') {
      notifyError(log).catch(err => console.error('Erro ao notificar log:', err));
    }

    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar log' });
  }
});

/**
 * DELETE /api/logs – Limpar logs antigos
 * Query: ?days=30 (apaga logs com mais de X dias)
 */
router.delete('/', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const { rowCount } = await pool.query(
      `DELETE FROM app_logs WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
      [days]
    );

    res.json({ message: `${rowCount} logs removidos` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao limpar logs' });
  }
});

export default router;
