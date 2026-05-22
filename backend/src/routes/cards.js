import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────

/**
 * Calcula o billing_month da primeira parcela baseado na data da compra
 * e no dia de fechamento do cartão.
 */
function getFirstBillingMonth(purchaseDate, closingDay) {
  const d = new Date(purchaseDate);
  const purchDay = d.getDate();

  if (purchDay > closingDay) {
    // Compra após o fechamento → vai para o próximo mês
    d.setMonth(d.getMonth() + 1);
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Gera due_date a partir de billing_month + due_day
 */
function getDueDate(billingMonth, dueDay) {
  return `${billingMonth}-${String(dueDay).padStart(2, '0')}`;
}

/**
 * Avança N meses a partir de um billing_month (YYYY-MM)
 */
function advanceMonth(billingMonth, n) {
  const [y, m] = billingMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── GET /api/cards ──────────────────────────────────────

/**
 * Retorna cartões com comprometimento de limite baseado em
 * total_amount das compras não quitadas (todas as parcelas pagas).
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    const { rows } = await pool.query(
      `SELECT
         cc.*,
         b.name AS bank_name, b.icon AS bank_icon, b.color AS bank_color,
         COALESCE((
           SELECT SUM(COALESCE(cp.total_amount, cp.amount))
           FROM card_purchases cp
           WHERE cp.card_id = cc.id AND cp.is_paid = FALSE
         ), 0) AS total_used,
         COALESCE((
           SELECT SUM(ci.amount)
           FROM card_installments ci
           WHERE ci.card_id = cc.id AND ci.billing_month = $3
         ), 0) AS current_invoice_total
       FROM credit_cards cc
       LEFT JOIN banks b ON b.id = cc.bank_id
       WHERE cc.household_id = $1::uuid
         AND (($2::uuid IS NOT NULL AND cc.user_id = $2::uuid) OR cc.is_shared = TRUE)
       ORDER BY cc.is_shared DESC, cc.card_name`,
      [req.householdId, user_id || null, req.query.month || new Date().toISOString().slice(0, 7)]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cartões' });
  }
});

// ─── POST /api/cards ──────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { user_id, card_name, card_brand, credit_limit, closing_day, due_day, color, is_shared, bank_id } = req.body;
    
    if (!user_id || !card_name) {
      return res.status(400).json({ error: 'user_id e card_name são obrigatórios' });
    }

    const cDay = parseInt(closing_day) || 1;
    const dDay = parseInt(due_day) || 10;

    const { rows } = await pool.query(
      `INSERT INTO credit_cards (user_id, card_name, card_brand, credit_limit, closing_day, due_day, color, is_shared, bank_id, household_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [user_id, card_name, card_brand, credit_limit || 0, cDay, dDay, color || '#3b82f6', is_shared ?? true, bank_id || null, req.householdId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar cartão' });
  }
});

// ─── GET /api/cards/:id/purchases?month=YYYY-MM ──────────

router.get('/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;
    
    let query = `
      SELECT cp.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             (SELECT COUNT(*) FROM card_installments WHERE purchase_id = cp.id AND is_paid = TRUE) as installments_paid
      FROM card_purchases cp
      LEFT JOIN categories c ON c.id = cp.category_id
      WHERE cp.card_id = $1 AND cp.household_id = $2
    `;
    const params = [id, req.householdId];

    if (month) {
      query += ` AND TO_CHAR(cp.purchase_date, 'YYYY-MM') = $3`;
      params.push(month);
    }

    query += ` ORDER BY cp.purchase_date DESC`;

    const { rows } = await pool.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar compras' });
  }
});

// ─── GET /api/cards/:id/invoice?month=YYYY-MM ─────────────
/**
 * Retorna as parcelas (installments) do cartão para um mês de fatura específico.
 * Usado para visualizar a fatura detalhada.
 */
router.get('/:id/invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    console.log(`Buscando fatura: Card ${id}, Month ${targetMonth}`);
    const { rows } = await pool.query(
      `SELECT ci.*, 
              cp.category_id, cp.purchase_date,
              c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM card_installments ci
       JOIN card_purchases cp ON cp.id = ci.purchase_id
       LEFT JOIN categories c ON c.id = cp.category_id
       WHERE ci.card_id = $1 AND ci.household_id = $3
         AND ci.billing_month = $2
       ORDER BY ci.due_date ASC, ci.description ASC`,
      [id, targetMonth, req.householdId]
    );

    console.log(`Found ${rows.length} installments for invoice`);

    // Total da fatura
    const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalPaid = rows.filter(r => r.is_paid).reduce((sum, r) => sum + Number(r.amount), 0);

    res.json({
      items: rows,
      total,
      total_paid: totalPaid,
      total_pending: total - totalPaid,
      month: targetMonth,
      count: rows.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar fatura' });
  }
});

// ─── POST /api/cards/:id/purchases ──────────────────────────
/**
 * Nova compra parcelada.
 * - Salva a Transação Pai em card_purchases
 * - Gera N parcelas filhas em card_installments
 * - Calcula o deslocamento de fatura baseado no dia de fechamento
 */
router.post('/:id/purchases', async (req, res) => {
  const client = await pool.connect();
  try {
    const cardId = req.params.id;
    const { description, amount, installments, category_id, purchase_date, user_id } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: 'description e amount são obrigatórios' });
    }

    const numInstallments = Math.max(1, parseInt(installments) || 1);
    const totalAmount = Number(amount);
    const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;
    const purchDate = purchase_date || new Date().toISOString().slice(0, 10);

    await client.query('BEGIN');

    // 1. Buscar dados do cartão (closing_day, due_day)
    const { rows: cardRows } = await client.query(
      'SELECT closing_day, due_day, user_id FROM credit_cards WHERE id = $1',
      [cardId]
    );

    if (cardRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    const card = cardRows[0];

    // 2. Salvar Transação Pai (card_purchases)
    //    amount = valor da parcela individual
    //    total_amount = valor integral da compra (para comprometimento de limite)
    const { rows: purchaseRows } = await client.query(
      `INSERT INTO card_purchases (card_id, description, amount, total_amount, installments, category_id, purchase_date, user_id, is_paid, household_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)
       RETURNING *`,
      [cardId, description, installmentAmount, totalAmount, numInstallments, category_id || null, purchDate, user_id || card.user_id, req.householdId]
    );

    const purchase = purchaseRows[0];

    // 3. Calcular primeira fatura
    const firstBillingMonth = getFirstBillingMonth(purchDate, card.closing_day);

    // 4. Gerar parcelas filhas
    const installmentRows = [];
    for (let i = 0; i < numInstallments; i++) {
      const billingMonth = advanceMonth(firstBillingMonth, i);
      const dueDate = getDueDate(billingMonth, card.due_day);
      const desc = numInstallments > 1
        ? `${description} (${i + 1}/${numInstallments})`
        : description;

      const { rows: instRows } = await client.query(
        `INSERT INTO card_installments (purchase_id, card_id, installment_num, total_num, amount, description, due_date, billing_month, household_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [purchase.id, cardId, i + 1, numInstallments, installmentAmount, desc, dueDate, billingMonth, req.householdId]
      );

      installmentRows.push(instRows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      purchase,
      installments: installmentRows,
      first_billing_month: firstBillingMonth,
      installment_amount: installmentAmount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: `Erro ao registrar compra: ${err.message}` });
  } finally {
    client.release();
  }
});

// ─── POST /api/cards/:id/pay-invoice ────────────────────────
/**
 * Pagar a fatura de um mês inteiro.
 * 1. Soma todas as parcelas pendentes do billing_month
 * 2. Cria uma transação de saída (expense) na conta bancária
 * 3. Marca as parcelas como pagas
 * 4. Se todas as parcelas de uma compra foram pagas, marca a compra como is_paid=TRUE
 *    (isso libera o limite do cartão)
 */
router.post('/:id/pay-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    const cardId = req.params.id;
    const { month, bank_id, user_id } = req.body;

    if (!month || !user_id) {
      return res.status(400).json({ error: 'month e user_id são obrigatórios' });
    }

    await client.query('BEGIN');

    // 1. Buscar parcelas pendentes do mês
    const { rows: pendingInstallments } = await client.query(
      `SELECT * FROM card_installments 
       WHERE card_id = $1 AND billing_month = $2 AND is_paid = FALSE`,
      [cardId, month]
    );

    if (pendingInstallments.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nenhuma parcela pendente neste mês' });
    }

    // 2. Somar valor total da fatura
    const invoiceTotal = pendingInstallments.reduce((sum, inst) => sum + Number(inst.amount), 0);

    // 3. Buscar nome do cartão para a descrição da transação
    const { rows: cardInfo } = await client.query(
      'SELECT card_name FROM credit_cards WHERE id = $1',
      [cardId]
    );
    const cardName = cardInfo[0]?.card_name || 'Cartão';

    // Formatar mês para exibição (Mai/25, Jun/25, etc.)
    const [yearStr, monthStr] = month.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthLabel = `${monthNames[parseInt(monthStr) - 1]}/${yearStr.slice(2)}`;

    // 4. Criar transação de saída na conta bancária
    const txDate = new Date().toISOString().slice(0, 10);
    const { rows: txRows } = await client.query(
      `INSERT INTO transactions 
        (user_id, bank_id, type, description, amount, payment_method, visibility, date, time, effective_month, is_paid, card_id, accounting_date)
       VALUES ($1, $2, 'expense', $3, $4, 'transfer', 'shared', $5, $6, $7, TRUE, $8, $5)
       RETURNING *`,
      [
        user_id,
        bank_id || null,
        `Fatura ${cardName} - ${monthLabel}`,
        invoiceTotal,
        txDate,
        new Date().toTimeString().slice(0, 8),
        txDate.slice(0, 7),
        cardId
      ]
    );

    // 4.1 Atualizar saldo do banco (se informado)
    if (bank_id) {
      await client.query(
        'UPDATE banks SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
        [invoiceTotal, bank_id]
      );
    }

    // 5. Marcar parcelas como pagas
    const installmentIds = pendingInstallments.map(i => i.id);
    await client.query(
      `UPDATE card_installments 
       SET is_paid = TRUE, paid_at = NOW() 
       WHERE id = ANY($1::uuid[])`,
      [installmentIds]
    );

    // 6. Verificar se compras foram totalmente quitadas (todas as parcelas pagas)
    //    e marcar a compra pai como is_paid = TRUE → libera o limite
    const purchaseIds = [...new Set(pendingInstallments.map(i => i.purchase_id))];
    for (const purchId of purchaseIds) {
      const { rows: remaining } = await client.query(
        'SELECT COUNT(*) as unpaid FROM card_installments WHERE purchase_id = $1 AND is_paid = FALSE',
        [purchId]
      );
      if (parseInt(remaining[0].unpaid) === 0) {
        await client.query(
          'UPDATE card_purchases SET is_paid = TRUE WHERE id = $1',
          [purchId]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      message: `Fatura de ${monthLabel} paga com sucesso`,
      invoice_total: invoiceTotal,
      installments_paid: pendingInstallments.length,
      transaction: txRows[0],
      purchases_fully_paid: purchaseIds.length
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: `Erro ao pagar fatura: ${err.message}` });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/cards/purchases/:purchaseId ─────────────────
// Edita a descrição de uma compra e sincroniza as parcelas

router.patch('/purchases/:purchaseId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { purchaseId } = req.params;
    const { description, category_id } = req.body;

    await client.query('BEGIN');

    // Atualiza a compra pai
    const { rows } = await client.query(
      `UPDATE card_purchases SET
         description  = COALESCE($1, description),
         category_id  = COALESCE($2::uuid, category_id),
         updated_at   = NOW()
       WHERE id = $3 AND household_id = $4 RETURNING *`,
      [description, category_id || null, purchaseId, req.householdId]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    // Se veio nova descrição, atualiza as parcelas também (mantém sufixo (x/N))
    if (description) {
      const totalNum = rows[0].installments;
      if (totalNum > 1) {
        // Pegar parcelas para recalcular descrição individual
        const { rows: insts } = await client.query(
          'SELECT id, installment_num FROM card_installments WHERE purchase_id = $1',
          [purchaseId]
        );
        for (const inst of insts) {
          await client.query(
            'UPDATE card_installments SET description = $1 WHERE id = $2',
            [`${description} (${inst.installment_num}/${totalNum})`, inst.id]
          );
        }
      } else {
        await client.query(
          'UPDATE card_installments SET description = $1 WHERE purchase_id = $2',
          [description, purchaseId]
        );
      }
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: `Erro ao atualizar compra: ${err.message}` });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/cards/purchases/:purchaseId ─────────────────
// Remove compra e todas as parcelas vinculadas

router.delete('/purchases/:purchaseId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { purchaseId } = req.params;

    await client.query('BEGIN');

    // Verifica ownership
    const { rows: check } = await client.query(
      'SELECT id FROM card_purchases WHERE id = $1 AND household_id = $2',
      [purchaseId, req.householdId]
    );

    if (check.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    await client.query('DELETE FROM card_installments WHERE purchase_id = $1', [purchaseId]);
    await client.query('DELETE FROM card_purchases WHERE id = $1', [purchaseId]);

    await client.query('COMMIT');
    res.json({ message: 'Compra e parcelas removidas' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: `Erro ao excluir compra: ${err.message}` });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/cards/:id ────────────────────────────────

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { card_name, card_brand, credit_limit, closing_day, due_day, color, is_shared, bank_id } = req.body;

    const cDay = closing_day !== undefined ? (parseInt(closing_day) || null) : undefined;
    const dDay = due_day !== undefined ? (parseInt(due_day) || null) : undefined;

    const { rows } = await pool.query(
      `UPDATE credit_cards SET
         card_name    = COALESCE($1, card_name),
         card_brand   = COALESCE($2, card_brand),
         credit_limit = COALESCE($3, credit_limit),
         closing_day  = COALESCE($4, closing_day),
         due_day      = COALESCE($5, due_day),
         color        = COALESCE($6, color),
         is_shared    = COALESCE($7, is_shared),
         bank_id      = $8
       WHERE id = $9 AND household_id = $10 RETURNING *`,
      [card_name, card_brand, credit_limit, cDay ?? null, dDay ?? null, color, is_shared, bank_id, id, req.householdId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Cartão não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar cartão' });
  }
});

// ─── DELETE /api/cards/:id ───────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(`DELETE FROM credit_cards WHERE id = $1 AND household_id = $2`, [id, req.householdId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Cartão não encontrado' });
    res.json({ message: 'Cartão removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar cartão' });
  }
});

export default router;
