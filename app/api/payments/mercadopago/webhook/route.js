// app/api/payments/mercadopago/webhook/route.js
import { NextResponse } from 'next/server';
import mpClient from 'lib/mercadopago'; // Ajuste o caminho se necessário
import { Payment } from 'mercadopago'; // Ajuste o caminho se necessário
import { dbPool } from '../../../lib/db'; // Ajuste o caminho se necessário
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

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
    // console.log('MP Webhook v2: Corpo RAW (preview):', rawBody.substring(0, 200) + "...");
  } catch (e) { // Usando 'e'
    console.error('MP Webhook v2: Erro ao ler o corpo da requisição como texto:', e);
    return new NextResponse(JSON.stringify({ message: 'Erro ao processar corpo da requisição.' }), {
      status: 400, 
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  if (!verifySignature(requestCloneForHeaders, rawBody)) { 
    console.error('MP Webhook v2: FALHA NA ASSINATURA! Rejeitando.');
    return new NextResponse(JSON.stringify({ message: 'Assinatura inválida.' }), {
      status: 401, 
      headers: { 'Content-Type': 'application/json' },
    });
  }
  console.log('MP Webhook v2: Assinatura verificada com SUCESSO. Prosseguindo com o processamento.');


  let body;

  try {
    body = JSON.parse(rawBody);
    // console.log('MP Webhook v2: Corpo parseado após verificação:', JSON.stringify(body, null, 2));
  } catch (e) { // Usando 'e'
    console.error('MP Webhook v2: Erro ao parsear rawBody para JSON após verificação:', e);
    return new NextResponse(JSON.stringify({ message: 'Corpo da requisição inválido após verificação de assinatura.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Se 'type' e 'action' não são usados diretamente na lógica abaixo, podem ser removidos da desestruturação.
  // Por enquanto, vamos mantê-los para o log, mas se o ESLint ainda reclamar, remova-os.
  const { data } = body; 
  let paymentId;
  // ... (lógica para extrair paymentId)

  if (data?.id) { 
    paymentId = data.id;
  } else if (action?.startsWith('payment.')) { // 'action' é usado aqui
    if (body.resource) { 
        const urlParts = body.resource.split('/');
        paymentId = urlParts[urlParts.length -1];
    }
    else if (data?.id) { 
        paymentId = data.id;
    }
  }

  if (!paymentId) { 
    console.log('MP Webhook v2: ID do pagamento não encontrado. Type:', type, 'Action:', action, 'Data:', data); // 'type' e 'action' usados no log
    return NextResponse.json({ message: 'ID do pagamento não encontrado ou evento não processável.' }, { status: 200 });
   }
    
  console.log(`MP Webhook v2: Processando pagamento ID: ${paymentId}`);

  let connection;
  try {
    const paymentHttpClient = new Payment(mpClient);
    const paymentInfo = await paymentHttpClient.get({ id: String(paymentId) }); 
    console.log('MP Webhook v2: Info Pagamento MP:', JSON.stringify(paymentInfo, null, 2));

    if (paymentInfo) {
      const { status: mpStatus, external_reference, id: mp_payment_id } = paymentInfo;
      const internalOrderId = parseInt(external_reference, 10);

      if (isNaN(internalOrderId) || internalOrderId <= 0) {
        console.error(`MP Webhook v2: external_reference (internalOrderId) inválido: ${external_reference}`);
        return NextResponse.json({ message: 'Referência externa inválida.' }, { status: 200 });
       }
      
      connection = await dbPool.getConnection();
      await connection.beginTransaction();

      const [currentOrderRows] = await connection.execute(
          "SELECT status, user_id, product_id FROM orders WHERE id = ?",
          [internalOrderId]
      );

      if (currentOrderRows.length === 0) { 
        console.error(`MP Webhook v2: Pedido interno ${internalOrderId} não encontrado.`);
        await connection.rollback();
        return NextResponse.json({ message: 'Pedido interno não encontrado.' }, { status: 200 });
       }
      
      const currentOrder = currentOrderRows[0];
      const currentOrderStatusInDb = currentOrder.status;
      
      console.log(`MP Webhook v2: Pedido ${internalOrderId} no DB: ${currentOrderStatusInDb}. Status MP: ${mpStatus}`);

      if (currentOrderStatusInDb === 'completed' && mpStatus === 'approved') { /* ... */ }

      let newOrderStatusInDb = currentOrderStatusInDb;
      if (mpStatus === 'approved') {
        newOrderStatusInDb = 'completed';
      } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpStatus)) {
        newOrderStatusInDb = 'failed'; 
      } else if (['pending', 'in_process', 'authorized'].includes(mpStatus)) {
        newOrderStatusInDb = 'pending';
      }

      if (newOrderStatusInDb !== currentOrderStatusInDb) {
        await connection.execute(
          "UPDATE orders SET status = ?, payment_details = CONCAT_WS('\\n', payment_details, ?) WHERE id = ?",
          [newOrderStatusInDb, `MP Payment ID: ${mp_payment_id}, MP Status: ${mpStatus}, WebhookTS: ${new Date().toISOString()}`, internalOrderId]
        );
        console.log(`MP Webhook v2: Pedido ${internalOrderId} atualizado para status DB '${newOrderStatusInDb}'.`);

        // --- LÓGICA PARA ATUALIZAR raffle_numbers ---
        if (newOrderStatusInDb === 'completed' && currentOrderStatusInDb !== 'completed') {
          // Pagamento aprovado, marcar números como 'sold'
          // O user_id e product_id já estão corretos nos números reservados
          const [updateSoldResult] = await connection.execute(
            "UPDATE raffle_numbers SET status = 'sold', reserved_at = NULL WHERE order_id = ? AND status = 'reserved'",
            [internalOrderId]
          );
          console.log(`MP Webhook v2: ${updateSoldResult.affectedRows} números para o pedido ${internalOrderId} marcados como 'sold'.`);
        } else if (newOrderStatusInDb === 'failed' && (currentOrderStatusInDb === 'pending' || currentOrderStatusInDb === 'reserved')) {
          // Pagamento falhou, liberar números reservados
          const [updateAvailableResult] = await connection.execute(
            "UPDATE raffle_numbers SET status = 'available', user_id = NULL, order_id = NULL, reserved_at = NULL WHERE order_id = ? AND status = 'reserved'",
            [internalOrderId]
          );
          console.log(`MP Webhook v2: ${updateAvailableResult.affectedRows} números para o pedido ${internalOrderId} liberados (status 'available').`);
        }
        // --- FIM DA LÓGICA PARA ATUALIZAR raffle_numbers ---

      } else { 
        /* ... (log de status já reflete) ... */
        console.log(`MP Webhook v2: Status do pedido ${internalOrderId} no DB ('${currentOrderStatusInDb}') já reflete o status do MP ('${mpStatus}') ou não requer atualização.`);
      }

      await connection.commit();
      return NextResponse.json({ message: 'Webhook processado com sucesso.' }, { status: 200 });
    } else { 
      /* ... (pagamento não encontrado no MP) ... */ 
      console.error('MP Webhook v2: Informação do pagamento não encontrada na resposta do MP para ID:', paymentId);
      return NextResponse.json({ message: 'Pagamento não encontrado no Mercado Pago (resposta vazia).' }, { status: 200 });
    }  
  } catch (error) {  if (connection) await connection.rollback();
    const errorMessage = error.cause?.message || error.data?.message || error.message || 'Erro desconhecido no processamento do webhook';
    console.error('MP Webhook v2: Erro CRÍTICO ao processar webhook:', error.cause || error.data || e); // Usando 'e'
    return new NextResponse(JSON.stringify({ message: 'Erro interno crítico no webhook.', details: errorMessage }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
   }
  finally {
      if (connection) connection.release();
      console.log('--- FIM DA REQUISIÇÃO WEBHOOK MERCADO PAGO ---');
  }
}
