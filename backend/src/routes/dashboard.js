import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/dashboard/summary?user_id=...&month=YYYY-MM
 * Retorna resumo do mês: entradas, saídas e saldo
 */
router.get('/summary', async (req, res) => {
  try {
    const { user_id, month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const householdId = req.householdId;

    const summaryQuery = `
      WITH all_spending AS (
        SELECT amount, type, effective_month, user_id, visibility, household_id FROM transactions
        UNION ALL
        SELECT ci.amount, 'expense' as type, ci.billing_month as effective_month, cc.user_id, 'shared' as visibility, ci.household_id 
        FROM card_installments ci
        JOIN card_purchases cp ON cp.id = ci.purchase_id
        JOIN credit_cards cc ON cc.id = ci.card_id
      )
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
      FROM all_spending 
      WHERE household_id = $1 AND effective_month = $2 
      AND (user_id = $3::uuid OR visibility = 'shared')
    `;

    const cardsQuery = `
      SELECT 
        COALESCE(SUM(credit_limit), 0) as total_limit,
        COALESCE((
          SELECT SUM(COALESCE(cp.total_amount, cp.amount))
          FROM card_purchases cp
          JOIN credit_cards cc2 ON cc2.id = cp.card_id
          WHERE cp.household_id = $1 AND cp.is_paid = FALSE
          AND (cc2.user_id = $2::uuid OR cc2.is_shared = TRUE)
        ), 0) as total_used
      FROM credit_cards 
      WHERE household_id = $1 AND (user_id = $2::uuid OR is_shared = TRUE)
    `;

    const goalsQuery = `
      SELECT 
        COALESCE(SUM(current_amount), 0) as total_saved,
        COALESCE(SUM(target_amount), 0) as total_target
      FROM goals 
      WHERE household_id = $1 AND (user_id = $2::uuid OR visibility = 'shared')
    `;

    const lastTransactionQuery = `
      SELECT amount, type 
      FROM transactions 
      WHERE household_id = $1 
      AND (user_id = $2::uuid OR visibility = 'shared')
      ORDER BY created_at DESC LIMIT 1
    `;

    const [summaryRes, cardsRes, goalsRes, lastTxRes] = await Promise.all([
      pool.query(summaryQuery, [householdId, targetMonth, user_id || null]),
      pool.query(cardsQuery, [householdId, user_id || null]),
      pool.query(goalsQuery, [householdId, user_id || null]),
      pool.query(lastTransactionQuery, [householdId, user_id || null])
    ]);

    res.json({
      ...summaryRes.rows[0],
      total_card_limit: cardsRes.rows[0].total_limit,
      total_card_used: cardsRes.rows[0].total_used,
      total_goals_saved: goalsRes.rows[0].total_saved,
      total_goals_target: goalsRes.rows[0].total_target,
      last_transaction: lastTxRes.rows[0] || null,
      server_date: new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).toISOString().slice(0, 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

/**
 * GET /api/dashboard/breakdown?user_id=...&month=YYYY-MM
 * Retorna gastos por categoria no mês
 */
router.get('/breakdown', async (req, res) => {
  try {
    const { user_id, month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const householdId = req.householdId;

    const { rows } = await pool.query(
      `WITH all_expenses AS (
         SELECT amount, category_id, goal_id, effective_month, user_id, visibility, household_id FROM transactions WHERE type = 'expense'
         UNION ALL
         SELECT ci.amount, cp.category_id, NULL as goal_id, ci.billing_month as effective_month, cc.user_id, 'shared' as visibility, ci.household_id 
         FROM card_installments ci
         JOIN card_purchases cp ON cp.id = ci.purchase_id
         JOIN credit_cards cc ON cc.id = ci.card_id
       ),
       categorized AS (
         SELECT 
           COALESCE(c.name, g.title, 'Sem Categoria') as name,
           COALESCE(c.icon, g.icon, '🎯') as icon,
           COALESCE(c.color, g.color, '#a3e635') as color,
           e.amount
         FROM all_expenses e
         LEFT JOIN categories c ON c.id = e.category_id
         LEFT JOIN goals g ON g.id = e.goal_id
         WHERE e.household_id = $1 
           AND (e.user_id = $2::uuid OR e.visibility = 'shared')
           AND e.effective_month = $3
       )
       SELECT name, icon, color, SUM(amount) as total
       FROM categorized
       GROUP BY name, icon, color
       ORDER BY total DESC`,
      [householdId, user_id || null, targetMonth]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar breakdown' });
  }
});

/**
 * GET /api/dashboard/evolution?user_id=...
 * Retorna evolução de entradas e saídas nos últimos 6 meses
 */
router.get('/evolution', async (req, res) => {
  try {
    const { user_id } = req.query;
    const householdId = req.householdId;
    
    const { rows } = await pool.query(`
      WITH months AS (
        SELECT TO_CHAR(CURRENT_DATE - (interval '1 month' * m), 'YYYY-MM') as month
        FROM generate_series(0, 5) m
      ),
      all_spending AS (
        SELECT amount, type, effective_month, user_id, visibility, household_id FROM transactions
        UNION ALL
        SELECT ci.amount, 'expense' as type, ci.billing_month as effective_month, cc.user_id, 'shared' as visibility, ci.household_id 
        FROM card_installments ci
        JOIN card_purchases cp ON cp.id = ci.purchase_id
        JOIN credit_cards cc ON cc.id = cp.card_id
      )
      SELECT 
        m.month,
        COALESCE(SUM(CASE WHEN s.type = 'income' THEN s.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN s.type = 'expense' THEN s.amount ELSE 0 END), 0) as expense
      FROM months m
      LEFT JOIN all_spending s ON s.effective_month = m.month 
        AND s.household_id = $1 
        AND (s.user_id = $2::uuid OR s.visibility = 'shared')
      GROUP BY m.month
      ORDER BY m.month ASC
    `, [householdId, user_id || null]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar evolução' });
  }
});

export default router;
