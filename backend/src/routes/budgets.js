import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /api/budgets?user_id=...&month=YYYY-MM
 * Returns budgets with calculated consumption based on rules
 */
router.get('/', async (req, res) => {
  try {
    const { user_id, month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Get all budgets
    const { rows: budgets } = await pool.query(
      `SELECT b.*, 
        COALESCE(json_agg(
          json_build_object('id', br.id, 'rule_type', br.rule_type, 'rule_value', br.rule_value)
        ) FILTER (WHERE br.id IS NOT NULL), '[]') AS rules
       FROM budgets b
       LEFT JOIN budget_rules br ON br.budget_id = b.id
       WHERE b.household_id = $1::uuid
         AND (b.user_id = $2::uuid OR b.visibility = 'shared')
         AND b.is_active = TRUE
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [req.householdId, user_id || null]
    );

    // Calculate consumption for each budget
    const enriched = await Promise.all(budgets.map(async (budget) => {
      const rules = budget.rules || [];
      let spent = 0;

      // Category rules
      const categoryIds = rules.filter(r => r.rule_type === 'category' && r.rule_value).map(r => Number(r.rule_value)).filter(n => !isNaN(n));
      // Card rules
      const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const cardIds = rules.filter(r => r.rule_type === 'card' && r.rule_value).map(r => r.rule_value).filter(isValidUUID);
      // Bank rules  
      const bankIds = rules.filter(r => r.rule_type === 'bank' && r.rule_value).map(r => Number(r.rule_value)).filter(n => !isNaN(n));

      // Sum from transactions matching any rule
      const conditions = [];
      const params = [targetMonth];
      let paramIdx = 3; // $1 is householdId, $2 is targetMonth

      if (categoryIds.length > 0) {
        conditions.push(`t.category_id = ANY($${paramIdx}::int[])`);
        params.push(categoryIds);
        paramIdx++;
      }
      if (cardIds.length > 0) {
        conditions.push(`t.card_id = ANY($${paramIdx}::uuid[])`);
        params.push(cardIds);
        paramIdx++;
      }
      if (bankIds.length > 0) {
        conditions.push(`t.bank_id = ANY($${paramIdx}::int[])`);
        params.push(bankIds);
        paramIdx++;
      }

      // Always include manually linked transactions
      conditions.push(`t.budget_id = $${paramIdx}::uuid`);
      params.push(budget.id);

      if (conditions.length > 0) {
        const { rows } = await pool.query(
          `WITH all_expenses AS (
             SELECT amount, category_id, card_id, bank_id, budget_id, type, effective_month, household_id
             FROM transactions
             UNION ALL
             SELECT ci.amount, cp.category_id, ci.card_id, NULL as bank_id, cp.budget_id, 'expense' as type, ci.billing_month as effective_month, ci.household_id
             FROM card_installments ci
             JOIN card_purchases cp ON cp.id = ci.purchase_id
           )
           SELECT COALESCE(SUM(t.amount), 0) AS total
           FROM all_expenses t
           WHERE t.type = 'expense'
             AND t.household_id = $1
             AND t.effective_month = $2
             AND (${conditions.join(' OR ')})`,
          [req.householdId, ...params]
        );
        spent = Number(rows[0]?.total || 0);
      }

      const remaining = Math.max(0, Number(budget.budget_limit) - spent);
      const percentage = Number(budget.budget_limit) > 0
        ? Math.round((spent / Number(budget.budget_limit)) * 100)
        : 0;

      // Calculate "can spend per day"
      const now = new Date();
      const [year, mo] = targetMonth.split('-').map(Number);
      const daysInMonth = new Date(year, mo, 0).getDate();
      const currentDay = (now.getFullYear() === year && now.getMonth() + 1 === mo)
        ? now.getDate()
        : daysInMonth;
      const daysLeft = Math.max(1, daysInMonth - currentDay + 1);
      const perDay = remaining / daysLeft;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        per_day: Math.round(perDay * 100) / 100,
        days_left: daysLeft,
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar budgets' });
  }
});

/**
 * POST /api/budgets – Create a new budget with rules
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, title, icon, color, budget_limit, budget_type, period, visibility, rules } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO budgets (user_id, title, icon, color, budget_limit, budget_type, period, visibility, household_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [user_id, title, icon || '📊', color || '#c6f150', budget_limit || 0, budget_type || 'category', period || 'monthly', visibility || 'shared', req.householdId]
      );

      const budget = rows[0];

      // Insert rules
      if (rules && rules.length > 0) {
        for (const rule of rules) {
          await client.query(
            `INSERT INTO budget_rules (budget_id, rule_type, rule_value) VALUES ($1, $2, $3)`,
            [budget.id, rule.rule_type, rule.rule_value]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(budget);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar budget' });
  }
});

/**
 * PATCH /api/budgets/:id – Update budget
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, icon, color, budget_limit, budget_type, period, visibility, rules } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `UPDATE budgets SET
           title = COALESCE($1, title),
           icon = COALESCE($2, icon),
           color = COALESCE($3, color),
           budget_limit = COALESCE($4, budget_limit),
           budget_type = COALESCE($5, budget_type),
           period = COALESCE($6, period),
           visibility = COALESCE($7, visibility),
           updated_at = NOW()
         WHERE id = $8 AND household_id = $9 RETURNING *`,
        [title, icon, color, budget_limit, budget_type, period, visibility, id, req.householdId]
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Budget não encontrado' });
      }

      // Replace rules if provided
      if (rules !== undefined) {
        await client.query('DELETE FROM budget_rules WHERE budget_id = $1', [id]);
        for (const rule of rules) {
          await client.query(
            `INSERT INTO budget_rules (budget_id, rule_type, rule_value) VALUES ($1, $2, $3)`,
            [id, rule.rule_type, rule.rule_value]
          );
        }
      }

      await client.query('COMMIT');
      res.json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar budget' });
  }
});

/**
 * DELETE /api/budgets/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM budgets WHERE id = $1 AND household_id = $2', [id, req.householdId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Budget não encontrado' });
    res.json({ message: 'Budget removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar budget' });
  }
});

export default router;
