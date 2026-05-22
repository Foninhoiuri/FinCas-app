import { Router } from 'express';
import pool from '../db/pool.js';
import { emit } from '../socket.js';

const router = Router();

// Helper para garantir que IDs (inteiros ou UUIDs) vazios virem NULL no banco
const toId = (val) => (val === "" || val === undefined || val === "null" || val === null) ? null : val;

// ─── Helpers para Cartão ──────────────────────────────────
function getFirstBillingMonth(purchaseDate, closingDay) {
  const d = new Date(purchaseDate);
  const purchDay = d.getDate();
  if (purchDay > closingDay) d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getDueDate(billingMonth, dueDay) {
  return `${billingMonth}-${String(dueDay).padStart(2, '0')}`;
}

function advanceMonth(billingMonth, n) {
  const [y, m] = billingMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * GET /api/transactions/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             b.name AS bank_name, b.icon AS bank_icon, b.color AS bank_color,
             u.avatar_url as user_avatar
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN banks b ON b.id = t.bank_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.id = $1 AND t.household_id = $2`, [id, req.householdId]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Transação não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar transação' });
  }
});

/**
 * GET /api/transactions?user_id=...&month=YYYY-MM&visibility=shared
 */
router.get('/', async (req, res) => {
  try {
    const { user_id, month, visibility, type, limit } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    let query = `
      WITH all_tx AS (
        SELECT 
          id, user_id, category_id, bank_id, type, description, amount, 
          payment_method, visibility, date, time, effective_month, 
          recurring_id, is_paid, card_id, accounting_date, created_at,
          household_id,
          FALSE as is_direct_card_purchase,
          NULL::int as installment_num, NULL::int as total_num,
          NULL::numeric as purchase_total
        FROM transactions
        UNION ALL
        SELECT 
          ci.id, cp.user_id, cp.category_id, NULL as bank_id, 'expense' as type, ci.description, ci.amount,
          'credit' as payment_method, 'shared' as visibility, ci.due_date as date, 
          '12:00:00' as time, ci.billing_month as effective_month,
          NULL as recurring_id, ci.is_paid, ci.card_id, ci.due_date as accounting_date, cp.created_at,
          ci.household_id,
          TRUE as is_direct_card_purchase,
          ci.installment_num, ci.total_num,
          cp.total_amount as purchase_total
        FROM card_installments ci
        JOIN card_purchases cp ON cp.id = ci.purchase_id
      )
      SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             b.name AS bank_name, b.icon AS bank_icon, b.color AS bank_color,
             cc.card_name,
             u.avatar_url as user_avatar
      FROM all_tx t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN banks b ON b.id = t.bank_id
      LEFT JOIN credit_cards cc ON cc.id = t.card_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.household_id = $1 AND (t.effective_month = $2 OR TO_CHAR(t.date, 'YYYY-MM') = $2)`;
    const params = [req.householdId, targetMonth];

    if (user_id) {
      params.push(user_id);
      query += ` AND (t.user_id = $${params.length}::uuid OR t.visibility = 'shared')`;
    }
    if (visibility === 'personal' && user_id) {
      query += ` AND t.visibility = 'personal' AND t.user_id = $${params.length}::uuid`;
    }
    if (type) {
      params.push(type);
      query += ` AND t.type = $${params.length}`;
    }

    query += ` ORDER BY t.date DESC, t.time DESC`;

    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar transações' });
  }
});

/**
 * POST /api/transactions – Adicionar gasto/receita
 * Auto-preenche date/time com valores atuais (editáveis)
 */
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      user_id, category_id, bank_id, type,
      description, amount, payment_method,
      visibility, date, time, effective_month, recurring_id,
      is_paid, card_id, accounting_date, goal_id, budget_id,
      is_recurring
    } = req.body;

    if (!user_id || !description || !amount) {
      return res.status(400).json({ error: 'user_id, description e amount são obrigatórios' });
    }

    await client.query('BEGIN');

    const txDate = date || new Date().toISOString().slice(0, 10);
    const targetAccDate = accounting_date || txDate;
    let result;

    // Se marcado como recorrente e não possui recurring_id ainda, cria a transação recorrente no banco
    let resolvedRecurringId = toId(recurring_id);
    if (is_recurring && !resolvedRecurringId) {
      const dayOfMonth = new Date(targetAccDate).getDate();
      const startMonth = targetAccDate.slice(0, 7);
      
      const { rows: recRows } = await client.query(
        `INSERT INTO recurring_transactions
          (user_id, category_id, bank_id, type, description, amount, payment_method, visibility, day_of_month, start_month, time, goal_id, household_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          user_id,
          toId(category_id),
          toId(bank_id),
          type || 'expense',
          description,
          amount,
          payment_method || 'pix',
          visibility || 'shared',
          dayOfMonth,
          startMonth,
          time || '00:00:00',
          toId(goal_id),
          req.householdId
        ]
      );
      resolvedRecurringId = recRows[0].id;
    }

    if (payment_method === 'credit' && type === 'expense' && card_id) {
      console.log(`💳 Processando compra no cartão: ${description} (${amount} em ${req.body.installments}x)`);
      
      const numInstallments = Math.max(1, parseInt(req.body.installments) || 1);
      const totalAmount = Number(amount);
      const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;

      // 1. Buscar dados do cartão
      const { rows: cardRows } = await client.query(
        'SELECT closing_day, due_day FROM credit_cards WHERE id = $1', [card_id]
      );
      if (cardRows.length === 0) {
        console.error(`❌ Erro: Cartão ${card_id} não encontrado`);
        throw new Error('Cartão não encontrado');
      }
      const card = cardRows[0];

      // 2. Salvar Transação Pai (card_purchases)
      const { rows: purchaseRows } = await client.query(
        `INSERT INTO card_purchases 
          (card_id, description, amount, total_amount, installments, category_id, purchase_date, accounting_date, user_id, is_paid, budget_id, household_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10, $11)
         RETURNING *`,
        [card_id, description, installmentAmount, totalAmount, numInstallments, toId(category_id), txDate, targetAccDate, user_id, toId(budget_id), req.householdId]
      );
      const purchase = purchaseRows[0];
      console.log(`✅ Compra pai criada: ${purchase.id}`);

      // 3. Gerar parcelas
      const firstBillingMonth = getFirstBillingMonth(targetAccDate, card.closing_day);
      console.log(`📅 Primeira fatura: ${firstBillingMonth} (Fechamento dia ${card.closing_day})`);

      for (let i = 0; i < numInstallments; i++) {
        const billingMonth = advanceMonth(firstBillingMonth, i);
        const dueDate = getDueDate(billingMonth, card.due_day);
        const instDesc = numInstallments > 1 ? `${description} (${i + 1}/${numInstallments})` : description;

        await client.query(
          `INSERT INTO card_installments 
            (purchase_id, card_id, installment_num, total_num, amount, description, due_date, billing_month, is_paid, household_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)`,
          [purchase.id, card_id, i + 1, numInstallments, installmentAmount, instDesc, dueDate, billingMonth, req.householdId]
        );
      }
      console.log(`✨ ${numInstallments} parcelas geradas com sucesso.`);
      result = { ...purchase, _is_card_purchase: true, first_billing_month: firstBillingMonth };
    } else {
      // --- Lógica de Transação Comum (Pix, Débito, Dinheiro, Entrada) ---
      const {
        skip_bank_update
      } = req.body;

      const { rows } = await client.query(
        `INSERT INTO transactions
          (user_id, category_id, bank_id, type, description, amount, payment_method, visibility, date, time, effective_month, recurring_id, is_paid, card_id, accounting_date, goal_id, budget_id, household_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          user_id,
          toId(category_id),
          toId(bank_id),
          type || 'expense',
          description,
          amount,
          payment_method || 'pix',
          visibility || 'shared',
          txDate,
          time || new Date().toTimeString().slice(0, 8),
          effective_month || targetAccDate.slice(0, 7),
          resolvedRecurringId,
          is_paid ?? true,
          toId(card_id),
          targetAccDate,
          toId(goal_id),
          toId(budget_id),
          req.householdId
        ]
      );
      result = rows[0];

      // Se for um aporte em meta, atualiza o saldo da meta
      if (goal_id && is_paid !== false) {
        await client.query(
          'UPDATE goals SET current_amount = current_amount + $1, updated_at = NOW() WHERE id = $2',
          [amount, goal_id]
        );
      }

      // Atualiza saldo do banco se for transação imediata (pix, débito, etc) e estiver pago
      // NOVO: Verifica se skip_bank_update é falso/ausente
      if (bank_id && is_paid !== false && payment_method !== 'credit' && !skip_bank_update) {
        const factor = type === 'income' ? 1 : -1;
        await client.query(
          'UPDATE banks SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [amount * factor, bank_id]
        );
      }
    }

    await client.query('COMMIT');

    // Log do sistema
    try {
      await pool.query(
        `INSERT INTO app_logs (level, source, message, details, user_id) VALUES ($1, $2, $3, $4, $5)`,
        ['info', 'api', `Transação criada: ${description}`, JSON.stringify({ type, payment_method, amount, installments: req.body.installments }), user_id]
      );
    } catch (logErr) {
      console.error('Erro ao gravar log:', logErr);
    }

    emit('transaction:created', result);
    res.status(201).json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no POST /transactions:', err);
    
    // Log de erro
    try {
      await pool.query(
        `INSERT INTO app_logs (level, source, message, details, user_id) VALUES ($1, $2, $3, $4, $5)`,
        ['error', 'api', `Erro ao criar transação: ${err.message}`, JSON.stringify({ stack: err.stack }), req.body.user_id]
      );
    } catch (logErr) {}

    res.status(500).json({ error: `Erro ao criar transação: ${err.message}` });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/transactions/:id
 */
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { scope } = req.query; // 'single' ou 'all'
    
    await client.query('BEGIN');

    // 1. Tenta encontrar se é uma transação normal ou parcela
    const { rows: txRows } = await client.query('SELECT id FROM transactions WHERE id = $1 AND household_id = $2', [id, req.householdId]);
    if (txRows.length > 0) {
      await client.query('DELETE FROM transactions WHERE id = $1 AND household_id = $2', [id, req.householdId]);
      await client.query('COMMIT');
      emit('transaction:deleted', { id });
      return res.json({ message: 'Transação removida' });
    }

    const { rows: instRows } = await client.query('SELECT id, purchase_id FROM card_installments WHERE id = $1 AND household_id = $2', [id, req.householdId]);
    if (instRows.length > 0) {
      const installment = instRows[0];
      
      if (scope === 'all' && installment.purchase_id) {
        // Remove toda a compra e TODAS as parcelas vinculadas
        await client.query('DELETE FROM card_installments WHERE purchase_id = $1 AND household_id = $2', [installment.purchase_id, req.householdId]);
        await client.query('DELETE FROM card_purchases WHERE id = $1 AND household_id = $2', [installment.purchase_id, req.householdId]);
        await client.query('COMMIT');
        emit('transaction:bulk_deleted', { purchase_id: installment.purchase_id });
        return res.json({ message: 'Compra integral removida' });
      } else {
        // Remove apenas a parcela específica
        await client.query('DELETE FROM card_installments WHERE id = $1 AND household_id = $2', [id, req.householdId]);
        await client.query('COMMIT');
        emit('transaction:deleted', { id });
        return res.json({ message: 'Parcela removida' });
      }
    }

    await client.query('ROLLBACK');
    res.status(404).json({ error: 'Registro não encontrado' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao apagar:', err);
    res.status(500).json({ error: 'Erro ao apagar registro' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/transactions/:id – Editar lançamento
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // 1. Tenta atualizar transações normais
    const { rows } = await pool.query(
      `UPDATE transactions SET
         category_id     = COALESCE($1, category_id),
         bank_id         = COALESCE($2, bank_id),
         type            = COALESCE($3, type),
         description     = COALESCE($4, description),
         amount          = COALESCE($5, amount),
         payment_method  = COALESCE($6, payment_method),
         visibility      = COALESCE($7, visibility),
         date            = COALESCE($8, date),
         time            = COALESCE($9, time),
         effective_month = COALESCE($10, TO_CHAR(COALESCE($13::date, accounting_date, $8::date, date), 'YYYY-MM')),
         is_paid         = COALESCE($11, is_paid),
         card_id         = COALESCE($12, card_id),
         accounting_date = COALESCE($13, accounting_date),
         budget_id       = COALESCE($14, budget_id),
         goal_id         = COALESCE($15, goal_id),
         updated_at      = NOW()
       WHERE id = $16 AND household_id = $17 RETURNING *`,
      [
        toId(body.category_id), toId(body.bank_id), body.type,
        body.description, body.amount, body.payment_method,
        body.visibility, body.date, body.time, body.effective_month,
        body.is_paid, toId(body.card_id), body.accounting_date,
        toId(body.budget_id), toId(body.goal_id), id, req.householdId
      ]
    );

    if (rows.length > 0) {
      emit('transaction:updated', rows[0]);
      return res.json(rows[0]);
    }

    // 2. Se não encontrou, tenta atualizar parcelas de cartão
    const { rows: instRows } = await pool.query(
      `UPDATE card_installments SET
         description = COALESCE($1, description),
         amount      = COALESCE($2, amount),
         is_paid     = COALESCE($3, is_paid),
         due_date    = COALESCE($4, due_date)
       WHERE id = $5 AND household_id = $6 RETURNING *`,
      [body.description, body.amount, body.is_paid, body.date, id, req.householdId]
    );

    if (instRows.length > 0) {
      emit('transaction:updated', instRows[0]);
      return res.json(instRows[0]);
    }

    res.status(404).json({ error: 'Registro não encontrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Erro ao atualizar registro: ${err.message}` });
  }
});

export default router;
