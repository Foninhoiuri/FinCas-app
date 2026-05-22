/**
 * Serviço de Notificações via Evolution API
 * Preparado para enviar mensagens WhatsApp quando faturas são processadas.
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';

/**
 * Envia uma mensagem de texto via Evolution API
 * @param {string} phone  – Número no formato 5511999999999
 * @param {string} message – Texto da mensagem
 */
export async function sendWhatsAppMessage(phone, message) {
  if (!EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.warn('⚠️  Evolution API não configurada. Notificação ignorada.');
    return null;
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: phone,
          text: message,
        }),
      }
    );

    const data = await response.json();
    console.log('📲 Notificação enviada:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error.message);
    return null;
  }
}

/**
 * Notifica sobre nova fatura processada
 */
export async function notifyNewBill(bill) {
  const message =
    `💰 *Nova fatura registrada*\n\n` +
    `🏢 Serviço: ${bill.service_name}\n` +
    `💵 Valor: R$ ${Number(bill.amount).toFixed(2)}\n` +
    `📅 Vencimento: ${bill.due_date}\n` +
    `${bill.barcode ? `📊 Código de barras registrado` : ''}`;

  const phones = (process.env.NOTIFY_PHONES || '').split(',').filter(Boolean);
  for (const phone of phones) {
    await sendWhatsAppMessage(phone.trim(), message);
  }
}

/**
 * Notifica sobre erros do sistema
 */
export async function notifyError(log) {
  const message =
    `❌ *Erro no Sistema*\n\n` +
    `📍 Origem: ${log.source || 'App'}\n` +
    `📝 Mensagem: ${log.message}\n` +
    `${log.details ? `🔍 Detalhes: ${JSON.stringify(log.details)}` : ''}`;

  const phones = (process.env.NOTIFY_PHONES || '').split(',').filter(Boolean);
  for (const phone of phones) {
    await sendWhatsAppMessage(phone.trim(), message);
  }
}
