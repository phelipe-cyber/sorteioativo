// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { dbPool } from '../../../lib/db'; // Usaremos dbPool para transações
import { verifyAuth } from 'lib/authMiddleware';

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Finaliza uma compra e marca números como vendidos
 *     description: >
 *       Esta API é chamada após um pagamento bem-sucedido (ex: retorno do Mercado Pago).
 *       Ela verifica a disponibilidade final dos números (considerando se já estão reservados/vendidos
 *       pelo mesmo usuário ou por outros). Se tudo estiver OK, marca os números como 'sold'
 *       e atualiza o pedido para 'completed' (se ainda não estiver).
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - selectedNumbers
 *               - internalOrderId
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: ID do produto.
 *               selectedNumbers:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista dos números selecionados.
 *               internalOrderId:
 *                 type: integer
 *                 description: O ID do pedido que foi previamente criado com status 'pending'.
 *               paymentDetails:
 *                 type: string
 *                 description: >
 *                  Detalhes do pagamento (ex: ID do pagamento do Mercado Pago).
 *     responses:
 *       '200':
 *         description: Pedido finalizado com sucesso, números marcados como vendidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 orderId:
 *                   type: integer
 *       '400':
 *         description: Requisição inválida (dados faltando, etc.).
 *       '401':
 *         description: Não autenticado.
 *       '404':
 *         description: Produto ou Pedido não encontrado.
 *       '409':
 *         description: Conflito (um ou mais números selecionados não estão disponíveis para este usuário).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 unavailable_numbers:
 *                   type: array
 *                   items:
 *                     type: integer
 *       '500':
 *         description: Erro interno do servidor.
 */

export async function POST(request) {
  console.log('API /api/orders (finalizar compra): Iniciando...');
  const authResult = await verifyAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const userId = authResult.payload.id; // ID do usuário que está fazendo a compra

  let connection;
  try {
    const { productId, selectedNumbers, internalOrderId, paymentDetails } = await request.json();

    console.log('API /api/orders: Dados recebidos:', { productId, selectedNumbers, internalOrderId, userId, paymentDetails });

    if (!productId || !selectedNumbers || !Array.isArray(selectedNumbers) || selectedNumbers.length === 0 || !internalOrderId) {
      console.error('API /api/orders: Dados da requisição incompletos.');
      return new NextResponse(JSON.stringify({ message: 'Dados da requisição incompletos (productId, selectedNumbers, internalOrderId são obrigatórios).' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    connection = await dbPool.getConnection();
    await connection.beginTransaction();
    console.log('API /api/orders: Transação iniciada.');

    // 1. Verificar o status do pedido interno. Ele deve existir e estar 'pending' ou já 'completed' (pelo webhook)
    const [orderRows] = await connection.execute(
      "SELECT status, total_amount FROM orders WHERE id = ? AND user_id = ?",
      [internalOrderId, userId]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      console.error(`API /api/orders: Pedido ID ${internalOrderId} não encontrado para o usuário ${userId}.`);
      return new NextResponse(JSON.stringify({ message: `Pedido ${internalOrderId} não encontrado ou não pertence a este usuário.` }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const currentOrder = orderRows[0];
    console.log(`API /api/orders: Status atual do pedido ${internalOrderId}: ${currentOrder.status}`);

    // Se o pedido já foi marcado como 'completed' (provavelmente pelo webhook),
    // podemos apenas retornar sucesso ou verificar se os números já foram marcados como 'sold'.
    // Por ora, vamos permitir o processamento para garantir que os números sejam marcados como 'sold' se ainda não foram.
    // Uma lógica mais robusta aqui poderia evitar reprocessamento desnecessário.

    // 2. Verificar disponibilidade dos números NA TABELA RAFFLE_NUMBERS
    // Um número é indisponível se:
    //    a) status = 'sold' (já vendido para qualquer um)
    //    b) status = 'reserved' E user_id != userId (reservado por outro usuário)
    const placeholders = selectedNumbers.map(() => '?').join(',');
    const [numberStatusRows] = await connection.execute(
      `SELECT number_value, status, user_id 
       FROM raffle_numbers 
       WHERE product_id = ? AND number_value IN (${placeholders}) FOR UPDATE`,
      [productId, ...selectedNumbers]
    );

    if (numberStatusRows.length !== selectedNumbers.length) {
      await connection.rollback();
      console.error('API /api/orders: Um ou mais números selecionados não existem para este produto na tabela raffle_numbers.');
      return new NextResponse(JSON.stringify({ message: 'Um ou mais números selecionados são inválidos.' }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    const trulyUnavailableNumbers = [];
    for (const numInfo of numberStatusRows) {
      if (numInfo.status === 'sold') {
        trulyUnavailableNumbers.push(numInfo.number_value);
      } else if (numInfo.status === 'reserved' && numInfo.user_id !== userId) {
        trulyUnavailableNumbers.push(numInfo.number_value);
      }
      // Se status === 'available', está OK.
      // Se status === 'reserved' AND user_id === userId, está OK (o usuário está confirmando sua própria reserva).
    }

    if (trulyUnavailableNumbers.length > 0) {
      await connection.rollback();
      console.error(`API /api/orders: Números indisponíveis para o usuário ${userId}: ${trulyUnavailableNumbers.join(', ')}`);
      return new NextResponse(
        JSON.stringify({ 
          message: `Os seguintes números não estão mais disponíveis para você: ${trulyUnavailableNumbers.join(', ')}. Outro usuário pode ter comprado ou reservado.`,
          unavailable_numbers: trulyUnavailableNumbers 
        }), 
        { status: 409, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // 3. Se todos os números selecionados estão disponíveis (ou reservados pelo próprio usuário),
    // marcar/atualizar os números como 'sold' e associar ao pedido e usuário.
    // Esta query atualiza números que estavam 'available' OU 'reserved' (pelo mesmo usuário e para este pedido).
    const [updateNumbersResult] = await connection.execute(
      `UPDATE raffle_numbers 
       SET status = 'sold', user_id = ?, order_id = ?, reserved_at = NULL 
       WHERE product_id = ? AND number_value IN (${placeholders}) AND (status = 'available' OR (status = 'reserved' AND user_id = ? AND order_id = ?))`,
      [userId, internalOrderId, productId, ...selectedNumbers, userId, internalOrderId]
    );

    if (updateNumbersResult.affectedRows !== selectedNumbers.length) {
      // Isso pode acontecer se alguns números já estavam 'sold' para este usuário/pedido,
      // ou se a condição de reserva não bateu para todos. É uma situação complexa.
      // Idealmente, a API de create-preference já reservou, e aqui só mudamos de 'reserved' para 'sold'.
      // Se o webhook já processou e marcou como 'sold', affectedRows pode ser 0 aqui, o que é OK.
      console.warn(`API /api/orders: Affected rows ao marcar como 'sold' (${updateNumbersResult.affectedRows}) diferente do esperado (${selectedNumbers.length}). Pode ser ok se já processado pelo webhook.`);
      // Não vamos dar rollback por isso, pois o pagamento foi aprovado.
      // Apenas logamos. A verificação de disponibilidade anterior é mais crítica.
    }
    console.log(`API /api/orders: ${updateNumbersResult.affectedRows} números marcados/confirmados como 'sold' para o pedido ${internalOrderId}.`);

    // 4. Atualizar o status do pedido para 'completed' (se ainda não estiver)
    // e adicionar detalhes do pagamento se fornecidos.
    let updateOrderQuery = "UPDATE orders SET status = 'completed'";
    const queryParams = [];
    if (paymentDetails) {
      updateOrderQuery += ", payment_details = CONCAT_WS('\\n', payment_details, ?)";
      queryParams.push(paymentDetails);
    }
    updateOrderQuery += " WHERE id = ? AND user_id = ?";
    queryParams.push(internalOrderId, userId);
    
    await connection.execute(updateOrderQuery, queryParams);
    console.log(`API /api/orders: Pedido ${internalOrderId} atualizado para 'completed'.`);

    await connection.commit();
    console.log('API /api/orders: Transação commitada.');

    return NextResponse.json({ 
        message: 'Pedido finalizado com sucesso! Seus números foram registrados.', 
        orderId: internalOrderId 
    }, { status: 200 });

  } catch (error) {
    if (connection) {
        console.error('API /api/orders: Erro detectado, realizando rollback...', error);
        await connection.rollback();
    }
    const errorMessage = error.cause?.message || error.data?.message || error.message || 'Erro desconhecido';
    console.error('API /api/orders: Erro final ao processar pedido:', error);
    return new NextResponse(JSON.stringify({ message: 'Erro ao finalizar seu pedido.', details: errorMessage }), {
      status: 500, 
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (connection) {
        console.log('API /api/orders: Liberando conexão com DB.');
        connection.release();
    }
  }
}
