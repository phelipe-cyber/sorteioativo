// app/api/payments/mercadopago/webhook/route.js
import { NextResponse } from 'next/server';
import mpClient from '@/app/lib/mercadopago'; // Ajuste o caminho se necessário
import { Payment } from 'mercadopago'; // Ajuste o caminho se necessário
import { dbPool } from '@/app/lib/db'; // Ajuste o caminho se necessário
import crypto from 'crypto';
import { createSuccessNotification, createFailureNotification, createReminderNotification, sendWhatsAppNotification } from '@/app/lib/whatsapp'; // Importar utilitários

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
// --- FUNÇÃO DE LOGGING ATUALIZADA para aceitar uma conexão existente ---
const logToDatabase = async (connection, level, context, message, payload = null, userId = null, orderId = null) => {
  const conn = connection || dbPool; // Usa a conexão fornecida ou uma nova do pool
  try {
    const query = "INSERT INTO system_logs (level, context, message, payload, user_id, order_id) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [level, context, message, payload ? JSON.stringify(payload) : null, userId, orderId];
    await conn.execute(query, values);
  } catch (dbError) {
    console.error("FALHA CRÍTICA AO LOGAR NO BANCO DE DADOS:", dbError);
    console.error("Log Original:", { level, context, message, payload, userId, orderId });
  }
};


// Função verifySignature (como estava antes, com os logs)
const verifySignature = (request, rawBody) => {
  console.log('MP Webhook - verifySignature: Iniciando verificação (método com id, x-request-id, ts - SEM rawBody no manifest)...');
  if (!WEBHOOK_SECRET) {
    console.warn('MP Webhook - verifySignature: Segredo do webhook (MP_WEBHOOK_SECRET) não configurado. Verificação pulada (NÃO FAÇA ISSO EM PRODUÇÃO).');
    return true; 
  }
  const signatureHeader = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');
  if (!signatureHeader) {
    console.error('MP Webhook - verifySignature: Cabeçalho x-signature ausente.');
    return false;
  }
  console.log('MP Webhook - verifySignature: Cabeçalho x-signature recebido:', signatureHeader);
  console.log('MP Webhook - verifySignature: Cabeçalho x-request-id recebido:', xRequestId);

  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) { acc[key.trim()] = value.trim(); }
    return acc;
  }, {});
  const receivedTimestamp = parts.ts;
  const receivedHmac = parts.v1;

  if (!receivedTimestamp || !receivedHmac) {
    console.error('MP Webhook - verifySignature: Timestamp (ts) ou HMAC (v1) ausentes. Parts:', parts);
    return false;
  }
  console.log('MP Webhook - verifySignature: Timestamp Extraído (ts):', receivedTimestamp);
  console.log('MP Webhook - verifySignature: HMAC Extraído (v1):', receivedHmac);
  
  let eventDataId; 
  try {
    const jsonBody = JSON.parse(rawBody);
    eventDataId = jsonBody.data?.id; 
    console.log('MP Webhook - verifySignature: Event Data ID (jsonBody.data.id) extraído:', eventDataId);
  } catch (e) {
    console.error('MP Webhook - verifySignature: Erro ao parsear rawBody para eventDataId:', e.message);
    return false;
  }

  if (!eventDataId) { 
    console.error('MP Webhook - verifySignature: Event Data ID (jsonBody.data.id) não encontrado.');
    return false;
  }
  
  let manifest = `id:${eventDataId};`;
  if (xRequestId) { manifest += `request-id:${xRequestId};`; }
  manifest += `ts:${receivedTimestamp};`;
  
  console.log('MP Webhook - verifySignature: Segredo Usado (preview):', WEBHOOK_SECRET ? `${WEBHOOK_SECRET.substring(0, 5)}...` : "N/A");
  console.log('MP Webhook - verifySignature: String Base (manifest):', manifest);

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(manifest);
  const calculatedHmac = hmac.digest('hex');

  console.log('MP Webhook - verifySignature: HMAC Recebido:', receivedHmac);
  console.log('MP Webhook - verifySignature: HMAC Calculado:', calculatedHmac);

  const signaturesMatch = crypto.timingSafeEqual(Buffer.from(calculatedHmac, 'hex'), Buffer.from(receivedHmac, 'hex'));
  
  if (signaturesMatch) {
    console.log('MP Webhook - verifySignature: Assinaturas COINCIDEM.');
  } else {
    console.error('MP Webhook - verifySignature: Assinaturas NÃO COINCIDEM!');
  }
  return signaturesMatch;
};

export async function POST(request) {
  console.log('--- INÍCIO DA REQUISIÇÃO WEBHOOK MERCADO PAGO ---');
  
  const requestCloneForHeaders = request.clone(); 
  let rawBody;
  try {
    rawBody = await request.text();
  } catch (e) {
    await logToDatabase(null, 'ERROR', 'webhook-body-read', e.message, { error: e.toString() }); // Passa null para connection
    return new NextResponse(JSON.stringify({ message: 'Erro ao processar corpo da requisição.' }), { status: 400 });
  }
  
  if (!verifySignature(requestCloneForHeaders, rawBody)) { 
    await logToDatabase(null, 'ERROR', 'webhook-signature', 'Falha na verificação da assinatura', { headers: JSON.stringify(Object.fromEntries(request.headers)) }); // Passa null para connection
    return new NextResponse(JSON.stringify({ message: 'Assinatura inválida.' }), { status: 401 });
  }
  
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    await logToDatabase(null, 'ERROR', 'webhook-body-parse', e.message, { rawBody: rawBody.substring(0, 500) }); // Passa null para connection
    return new NextResponse(JSON.stringify({ message: 'Corpo da requisição inválido.' }), { status: 400 });
  }

  const { data } = body;
  let paymentId = data?.id;

  if (!paymentId) {
    await logToDatabase(null, 'WARN', 'webhook-no-payment-id', 'Webhook recebido sem ID de pagamento.', body); // Passa null para connection
    return NextResponse.json({ message: 'Evento recebido, mas sem ID de pagamento para processar.' }, { status: 200 });
  }
    
  let connection;
  let userIdForLogging = null;
  let orderIdForLogging = null; 
  try {
    const paymentHttpClient = new Payment(mpClient);
    const paymentInfo = await paymentHttpClient.get({ id: String(paymentId) }); 
    const { status: mpStatus, external_reference, id: mp_payment_id } = paymentInfo;
    const internalOrderId = parseInt(external_reference, 10);
    orderIdForLogging = internalOrderId; 

    if (isNaN(internalOrderId) || internalOrderId <= 0) {
      await logToDatabase(null, 'ERROR', 'webhook-invalid-ref', 'Referência externa inválida no pagamento do MP.', { paymentId, external_reference }, null, orderIdForLogging);
      return NextResponse.json({ message: 'Referência externa inválida.' }, { status: 200 });
    }
      
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    const [orderRows] = await connection.execute(
      "SELECT o.status, o.user_id, o.product_id, u.name as user_name, u.phone as user_phone, p.name as product_name FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id WHERE o.id = ?", 
      [internalOrderId]
    );
    if (orderRows.length === 0) { 
      await logToDatabase(connection, 'WARN', 'webhook-order-not-found', `Pedido interno ${internalOrderId} não encontrado.`, { paymentId }, null, orderIdForLogging);
      await connection.rollback();
      return NextResponse.json({ message: 'Pedido interno não encontrado.' }, { status: 200 });
    }
      
    const currentOrder = orderRows[0];
    const currentOrderStatusInDb = currentOrder.status;
    userIdForLogging = currentOrder.user_id; 

    if (currentOrderStatusInDb === 'completed') {
      await connection.commit();
      return NextResponse.json({ message: 'Pedido já processado e completo.' });
    }

    let newOrderStatusInDb = currentOrderStatusInDb;
    if (mpStatus === 'approved') newOrderStatusInDb = 'completed';
    else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpStatus)) newOrderStatusInDb = 'failed';
    else if (['pending', 'in_process', 'authorized', 'null'].includes(mpStatus)) newOrderStatusInDb = 'pending';
    
    console.log("Validação status: ", newOrderStatusInDb, currentOrderStatusInDb)

    if (newOrderStatusInDb !== currentOrderStatusInDb) {
      // --- PASSANDO a conexão existente para o log ---
      await logToDatabase(connection, 'INFO', 'webhook-status-change', `Pedido ${internalOrderId} mudou de ${currentOrderStatusInDb} para ${newOrderStatusInDb}`, { paymentId, mpStatus }, userIdForLogging, orderIdForLogging);
      await connection.execute(
        "UPDATE orders SET status = ?, payment_details = CONCAT_WS('\\n', payment_details, ?) WHERE id = ?",
        [newOrderStatusInDb, `MP Payment ID: ${mp_payment_id}, MP Status: ${mpStatus}, WebhookTS: ${new Date().toISOString()}`, internalOrderId]
      );
      
     // --- LÓGICA DE NOTIFICAÇÃO E ATUALIZAÇÃO DE NÚMEROS CORRIGIDA ---
     if (newOrderStatusInDb === 'completed') {
      // 1. Busca os números que ESTÃO reservados para este pedido
      const [reservedNumbersRows] = await connection.execute(
          "SELECT number_value FROM raffle_numbers WHERE order_id = ? AND status = 'reserved'",
          [internalOrderId]
      );
      
      // 2. Atualiza os números de 'reserved' para 'sold'
      const [updateSoldResult] = await connection.execute(
        "UPDATE raffle_numbers SET status = 'sold', reserved_at = NULL WHERE order_id = ? AND status = 'reserved'",
        [internalOrderId]
      );

      // 3. Envia a notificação com os números que acabaram de ser confirmados
      if(currentOrder.user_phone && reservedNumbersRows.length > 0) {
          const soldNumbers = reservedNumbersRows.map(n => n.number_value);
          const { message, buttons } = createSuccessNotification(currentOrder.user_name, currentOrder.product_name, internalOrderId, soldNumbers);
          await sendWhatsAppNotification(currentOrder.user_phone, message, buttons);
          await logToDatabase(connection, 'INFO', 'whatsapp-sent-success', message, { numbers: soldNumbers }, userIdForLogging, orderIdForLogging);
      }
      await logToDatabase(connection, 'INFO', 'webhook-numbers-sold', `${updateSoldResult.affectedRows} números marcados como 'sold'.`, { orderId: internalOrderId }, userIdForLogging, orderIdForLogging);
    
    } else if (newOrderStatusInDb === 'failed') { 
      // Lógica para falha (como antes)
      const [releaseResult] = await connection.execute(
        "UPDATE raffle_numbers SET status = 'available', user_id = NULL, order_id = NULL, reserved_at = NULL WHERE order_id = ? AND status = 'reserved'",
        [internalOrderId]
      );
      
      if (currentOrder.user_phone) {
          const paymentRetryLink = `${process.env.APP_URL}/products/${currentOrder.product_id}`;
          const { message, buttons } = createFailureNotification(currentOrder.user_name, currentOrder.product_name, internalOrderId, paymentRetryLink);
          await sendWhatsAppNotification(currentOrder.user_phone, message, buttons);
          await logToDatabase(connection, 'INFO', 'whatsapp-sent-failure', message, { orderId: internalOrderId }, userIdForLogging, orderIdForLogging);
      }
      await logToDatabase(connection, 'INFO', 'webhook-numbers-released', `${releaseResult.affectedRows} números libertados.`, { orderId: internalOrderId }, userIdForLogging, orderIdForLogging);
    
    } else if (newOrderStatusInDb === 'pending') {
      // Lógica para pendente (agora será acionada corretamente)
      if (currentOrder.user_phone) {
          const paymentRetryLink = `${process.env.APP_URL}/my-numbers?filter=pending`;
          const [reservedNumbersRows] = await connection.execute(
              "SELECT number_value FROM raffle_numbers WHERE order_id = ? AND status = 'reserved'",
              [internalOrderId]
          );
          const reservedNumbers = reservedNumbersRows.map(n => n.number_value);
          if (reservedNumbers.length > 0) {
              const { message, buttons } = createReminderNotification(currentOrder.user_name, currentOrder.product_name, internalOrderId, reservedNumbers, paymentRetryLink);
              await sendWhatsAppNotification(currentOrder.user_phone, message, buttons);
              await logToDatabase(connection, 'INFO', 'whatsapp-sent-pending', message, { orderId: internalOrderId }, userIdForLogging, orderIdForLogging);
          }
      }
    }
    }

    if (newOrderStatusInDb === 'pending') {
      // Lógica para pendente (agora será acionada corretamente)
      if (currentOrder.user_phone) {
          const paymentRetryLink = `${process.env.APP_URL}/my-numbers?filter=pending`;
          const [reservedNumbersRows] = await connection.execute(
              "SELECT number_value FROM raffle_numbers WHERE order_id = ? AND status = 'reserved'",
              [internalOrderId]
          );
          const reservedNumbers = reservedNumbersRows.map(n => n.number_value);
          if (reservedNumbers.length > 0) {
              const { message, buttons } = createReminderNotification(currentOrder.user_name, currentOrder.product_name, internalOrderId, reservedNumbers, paymentRetryLink);
              await sendWhatsAppNotification(currentOrder.user_phone, message, buttons);
              await logToDatabase(connection, 'INFO', 'whatsapp-sent-pending', message, { orderId: internalOrderId }, userIdForLogging, orderIdForLogging);
          }
      }
    }
    
    await connection.commit();
    return NextResponse.json({ message: 'Webhook processado com sucesso.' }, { status: 200 });

  } catch (error) {
    if (connection) await connection.rollback();
    const errorMessage = error.cause?.message || error.data?.message || error.message || 'Erro desconhecido';
    await logToDatabase(null, 'ERROR', 'webhook-critical-error', errorMessage, { paymentId, error: error.toString() }, userIdForLogging, orderIdForLogging);
    return new NextResponse(JSON.stringify({ message: 'Erro interno crítico no webhook.', details: errorMessage }), { status: 500 });
  } finally {
      if (connection) connection.release();
  }
}
