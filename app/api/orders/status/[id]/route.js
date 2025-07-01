// app/api/orders/status/[id]/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { verifyAuth } from '../../../../../lib/authMiddleware';

/**
 * @swagger
 * /api/orders/status/{id}:
 * get:
 * summary: Obtém o estado de um pedido específico
 * description: Retorna o estado atual de um pedido para o utilizador autenticado.
 * tags:
 * - Orders
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: O ID do pedido a ser verificado.
 * responses:
 * '200':
 * description: Sucesso. Retorna o estado do pedido.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * status:
 * type: string
 * '401':
 * description: Não autenticado.
 * '404':
 * description: Pedido não encontrado.
 */
export async function GET(request, { params }) {
  const authResult = await verifyAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const userId = authResult.payload.id;
  const orderId = params.id;

  try {
    const [order] = await query({
      query: "SELECT status FROM orders WHERE id = ? AND user_id = ?",
      values: [orderId, userId],
    });

    if (!order) {
      return new NextResponse(
        JSON.stringify({ message: 'Pedido não encontrado ou não pertence a este utilizador.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json({ status: order.status });
  } catch (error) {
    console.error(`Erro ao buscar estado do pedido ${orderId}:`, error);
    return new NextResponse(
        JSON.stringify({ message: 'Erro interno do servidor.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
