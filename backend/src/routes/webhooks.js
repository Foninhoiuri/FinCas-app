import { Router } from 'express';
import pool from '../db/pool.js';
import { notifyNewBill } from '../services/notifications.js';

const router = Router();

/**
 * POST /api/webhooks/faturas
 *
 * Recebe faturas de integrações externas (n8n).
 * Payload esperado:
 * {
 *   "servico": "CPFL",
 *   "valor": 150.00,
 *   "vencimento": "YYYY-MM-DD",
 *   "codigoBarras": "..."
 * }
 */
router.post('/faturas', async (req, res) => {
  try {
    const { servico, valor, vencimento, codigoBarras } = req.body;

    // ── Validação ──────────────────────────────────────────
    if (!servico || !valor || !vencimento) {
      return res.status(400).json({
        error: 'Campos obrigatórios: servico, valor, vencimento',
      });
    }

    // ── Log do webhook ─────────────────────────────────────
    await pool.query(
      `INSERT INTO webhook_logs (source, payload) VALUES ($1, $2)`,
      [servico, JSON.stringify(req.body)]
    );

    // ── Buscar primeiro usuário (Igor) como owner padrão ───
    const { rows: users } = await pool.query(
      `SELECT id FROM users ORDER BY created_at ASC LIMIT 1`
    );
    const userId = users[0]?.id;

    if (!userId) {
      return res.status(500).json({ error: 'Nenhum usuário cadastrado' });
    }

    // ── Inserir fatura ─────────────────────────────────────
    const { rows } = await pool.query(
      `INSERT INTO bills (user_id, service_name, amount, due_date, barcode)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, servico, valor, vencimento, codigoBarras || null]
    );

    const bill = rows[0];

    // ── Notificar via Evolution API (assíncrono) ───────────
    notifyNewBill(bill).catch((err) =>
      console.error('Erro na notificação:', err.message)
    );

    // ── Resposta ───────────────────────────────────────────
    res.status(201).json({
      message: 'Fatura registrada com sucesso',
      bill,
    });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).json({ error: 'Erro ao processar fatura' });
  }
});

export default router;
