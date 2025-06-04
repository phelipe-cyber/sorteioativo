// app/api/orders/my-orders/route.js

import { NextResponse } from 'next/server';
import { query } from '../../../lib/db'; // Ajuste o caminho se necessário
import { verifyAuth } from '../../../lib/authMiddleware'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Lista os pedidos e números comprados pelo usuário autenticado
 *     description: Retorna uma lista detalhada dos pedidos feitos pelo usuário, incluindo informações do produto, status do pedido e os números específicos comprados.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Uma lista de pedidos do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       order_id:
 *                         type: integer
 *                       product_id:
 *                         type: integer
 *                       order_date:
 *                         type: string
 *                         format: date-time
 *                       total_amount:
 *                         type: number
 *                         format: float
 *                       status:
 *                         type: string
 *                         description: Status do pedido (pending, completed, failed)
 *                       product:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           image_url:
 *                             type: string
 *                           status:
 *                             type: string
 *                             description: Status do sorteio (do produto)
 *                           winning_number:
 *                             type: integer
 *                       purchasedNumbers:
 *                         type: array
 *                         items:
 *                           type: integer
 *       '401':
 *         description: Não autenticado.
 *       '500':
 *         description: Erro interno do servidor.
 */

export async function GET(request) {
  const authResult = await verifyAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const userId = authResult.payload.id;
  console.log(`API my-orders: Buscando pedidos para o usuário ID: ${userId}`);

  try {
    // 1. Buscar todos os pedidos do usuário, incluindo o status do pedido
    const userOrders = await query({
      query: `
        SELECT 
          o.id as order_id, 
          o.product_id, 
          o.created_at as order_date, 
          o.total_amount,
          o.status as order_status  -- <<< ADICIONADO O STATUS DO PEDIDO AQUI
        FROM orders o
        WHERE o.user_id = ? 
        ORDER BY o.created_at DESC
      `,
      values: [userId],
    });

    console.log(`API my-orders: ${userOrders.length} pedidos encontrados para o usuário ID: ${userId}`);

    if (userOrders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // 2. Para cada pedido, buscar os detalhes do produto e os números comprados
    const detailedOrders = await Promise.all(
      userOrders.map(async (order) => {
        // Buscar detalhes do produto
        const [productDetailsArr] = await query({
          query: "SELECT name, image_url, status as product_status, winning_number FROM products WHERE id = ?",
          values: [order.product_id],
        });
        // Renomeado product.status para product_status para evitar conflito com order.status
        const productDetails = productDetailsArr || {}; 

        // Buscar números comprados para este pedido específico
        // Isso assume que quando um pedido é 'completed', os números em 'raffle_numbers'
        // são atualizados com o order_id e user_id corretos e status 'sold'.
        // let purchasedNumbers = [];
        // if (order.order_status === 'completed' ) { // Só busca números se o pedido estiver completo
        //     const purchasedNumbersRows = await query({
        //     query: "SELECT number_value FROM raffle_numbers WHERE order_id = ? AND user_id = ? AND status = 'sold' ORDER BY number_value ASC",
        //     values: [order.order_id, userId],
        //     });
        //     purchasedNumbers = purchasedNumbersRows.map(n => n.number_value);
        // }

        let purchasedNumbers = [];
        if (order.order_status === 'completed' || order.order_status === 'pending') {
            const numberStatusToFetch = order.order_status === 'completed' ? 'sold' : 'reserved'; // <<< CORRETO PARA PENDENTE
            const purchasedNumbersRows = await query({
                query: "SELECT number_value FROM raffle_numbers WHERE order_id = ? AND user_id = ? AND status = ? ORDER BY number_value ASC",
                values: [order.order_id, userId, numberStatusToFetch], // <<< CORRETO
            });
            purchasedNumbers = purchasedNumbersRows.map(n => n.number_value);
        }

        return {
          order_id: order.order_id,
          product_id: order.product_id,
          order_date: order.order_date,
          total_amount: order.total_amount,
          status: order.order_status, // Usando o alias order_status
          product: {
            name: productDetails.name,
            image_url: productDetails.image_url,
            status: productDetails.product_status, // Usando o alias product_status
            winning_number: productDetails.winning_number,
          },
          purchasedNumbers,
        };
      })
    );
    console.log(`API my-orders: Pedidos detalhados para usuário ID ${userId}:`, JSON.stringify(detailedOrders, null, 2).substring(0, 500) + "...");
    return NextResponse.json({ orders: detailedOrders });

  } catch (error) {
    console.error(`API my-orders: Erro ao buscar pedidos para usuário ID ${userId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao buscar pedidos' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
