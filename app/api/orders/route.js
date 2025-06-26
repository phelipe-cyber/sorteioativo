// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { dbPool } from '@/app/lib/db'; // Usaremos dbPool para transações
import { verifyAuth } from '@/app/lib/authMiddleware';

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
  const userId = authResult.payload.id; 

  let connection;
  try {
    const { internalOrderId, paymentDetails } = await request.json();

    console.log('API /api/orders: Dados recebidos:', { internalOrderId, userId, paymentDetails });

    if (!internalOrderId) {
      console.error('API /api/orders: internalOrderId é obrigatório.');
      return new NextResponse(JSON.stringify({ message: 'ID do pedido interno (internalOrderId) é obrigatório.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    connection = await dbPool.getConnection();
    await connection.beginTransaction();
    console.log('API /api/orders: Transação iniciada.');

    // 1. Buscar o pedido pendente e seu productId
    const [orderRows] = await connection.execute(
      "SELECT id, product_id, status, final_total FROM orders WHERE id = ? AND user_id = ? FOR UPDATE", // FOR UPDATE
      [internalOrderId, userId]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      console.error(`API /api/orders: Pedido pendente ID ${internalOrderId} não encontrado para o usuário ${userId}.`);
      return new NextResponse(JSON.stringify({ message: `Pedido ${internalOrderId} não encontrado ou não pertence a este usuário.` }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const currentOrder = orderRows[0];
    const productId = currentOrder.product_id; // Obtido do pedido
    console.log(`API /api/orders: Pedido ${internalOrderId} encontrado. Produto ID: ${productId}, Status atual: ${currentOrder.status}`);

    // Se o pedido já foi 'completed' (pelo webhook, por exemplo), não fazer nada ou apenas retornar sucesso.
    if (currentOrder.status === 'completed') {
        await connection.commit(); // Finaliza a transação sem fazer mais nada
        console.log(`API /api/orders: Pedido ${internalOrderId} já está 'completed'. Nenhuma ação adicional tomada.`);
        return NextResponse.json({ message: 'Pedido já finalizado anteriormente.', orderId: internalOrderId }, { status: 200 });
    }
    // Se não estiver 'pending', é um estado inesperado para esta API de finalização
    if (currentOrder.status !== 'pending') {
        await connection.rollback();
        console.error(`API /api/orders: Pedido ${internalOrderId} não está com status 'pending'. Status atual: ${currentOrder.status}.`);
        return new NextResponse(JSON.stringify({ message: `Pedido ${internalOrderId} não pode ser finalizado pois não está pendente.` }), {
            status: 409, headers: { 'Content-Type': 'application/json' }, // Conflict
        });
    }


    // 2. Buscar os números que foram RESERVADOS para este pedido
    const [reservedNumbersRows] = await connection.execute(
      `SELECT number_value, status, user_id 
       FROM raffle_numbers 
       WHERE order_id = ? AND product_id = ? AND status = 'reserved' AND user_id = ? FOR UPDATE`,
      [internalOrderId, productId, userId]
    );

    if (reservedNumbersRows.length === 0) {
      // Isso pode acontecer se o webhook já processou e converteu para 'sold',
      // ou se a reserva falhou/expirou e foram liberados.
      // Se o pedido ainda está 'pending' aqui, é um problema.
      // Vamos verificar o status do pedido novamente. Se ainda pending, mas sem números reservados, é um erro.
      const [checkOrderAgain] = await connection.execute("SELECT status FROM orders WHERE id = ?", [internalOrderId]);
      if (checkOrderAgain.length > 0 && checkOrderAgain[0].status === 'pending') {
        await connection.rollback();
        console.error(`API /api/orders: Nenhum número reservado encontrado para o pedido pendente ${internalOrderId}, mas o pedido ainda está pendente.`);
        return new NextResponse(JSON.stringify({ message: 'Nenhum número reservado encontrado para este pedido pendente. A reserva pode ter expirado ou houve um erro.' }), 
            { status: 409, headers: { 'Content-Type': 'application/json' }});
      }
      // Se o pedido não está mais pending, o webhook pode ter processado.
      console.warn(`API /api/orders: Nenhum número reservado encontrado para o pedido ${internalOrderId}. O webhook pode já ter processado.`);
      // Não é necessariamente um erro fatal aqui, pois o webhook pode ter concluído.
      // Apenas atualizaremos o pedido para 'completed' se ainda não estiver.
    }
    
    const selectedNumbersFromReservation = reservedNumbersRows.map(n => n.number_value);
    console.log(`API /api/orders: Números reservados encontrados para pedido ${internalOrderId}:`, selectedNumbersFromReservation);


    // 3. Marcar os números reservados como 'sold'
    if (selectedNumbersFromReservation.length > 0) {
        const placeholders = selectedNumbersFromReservation.map(() => '?').join(',');
        const [updateNumbersResult] = await connection.execute(
        `UPDATE raffle_numbers 
         SET status = 'sold', reserved_at = NULL 
         WHERE product_id = ? AND order_id = ? AND user_id = ? AND status = 'reserved' AND number_value IN (${placeholders})`,
        [productId, internalOrderId, userId, ...selectedNumbersFromReservation]
        );
        console.log(`API /api/orders: ${updateNumbersResult.affectedRows} números marcados/confirmados como 'sold' para o pedido ${internalOrderId}.`);
        if (updateNumbersResult.affectedRows !== selectedNumbersFromReservation.length) {
            console.warn(`API /api/orders: Discrepância ao marcar números como 'sold'. Esperado: ${selectedNumbersFromReservation.length}, Atualizado: ${updateNumbersResult.affectedRows}. Isso pode ser ok se alguns já foram marcados.`);
        }
    } else if (currentOrder.status === 'pending'){ // Se o pedido está pendente mas não encontramos números reservados
        // Isso pode indicar um problema na lógica de reserva ou que o webhook já liberou os números por falha no pagamento
        // e esta chamada à /api/orders é tardia.
        console.warn(`API /api/orders: Pedido ${internalOrderId} está pendente, mas não foram encontrados números reservados para ele. Verifique o fluxo de webhook e reserva.`);
        // Não vamos impedir a finalização do pedido se o webhook já o atualizou para 'completed',
        // mas se ele ainda estiver 'pending' e não acharmos números reservados, é um problema.
        // O webhook é a fonte de verdade para a transição de 'reserved' para 'sold' ou 'available'.
        // Esta API /api/orders atua mais como uma confirmação/finalização do lado do cliente.
    }


    // 4. Atualizar o status do pedido para 'completed'
    // let updateOrderQuery = "UPDATE orders SET status = 'completed'";
    // const queryParams = [];
    // const paymentInfoString = paymentDetails || `Finalizado via /api/orders em ${new Date().toISOString()}`;
    
    // updateOrderQuery += ", payment_details = CONCAT_WS('\\n', payment_details, ?)";
    // queryParams.push(paymentInfoString);
    
    // updateOrderQuery += " WHERE id = ? AND user_id = ?";
    // queryParams.push(internalOrderId, userId);
    
    // await connection.execute(updateOrderQuery, queryParams);
    // console.log(`API /api/orders: Pedido ${internalOrderId} atualizado para 'completed'.`);

    // await connection.commit();
    // console.log('API /api/orders: Transação commitada.');

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
