// app/api/admin/orders/[id]/remind/route.js

import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db'; // Ajuste o caminho
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware'; // Ajuste o caminho
import { sendPaymentReminderEmail } from '@/app/lib/mailer'; // Ajuste o caminho

/**
 * @swagger
 * /api/admin/orders/{id}/remind:
 * post:
 * summary: Envia um e-mail de lembrete para um pedido pendente (Admin)
 * description: (Admin) Busca os detalhes de um pedido pendente e envia um e-mail de lembrete para o cliente.
 * tags:
 * - Admin - Orders
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * '200':
 * description: E-mail de lembrete enviado com sucesso.
 * '404':
 * description: Pedido não encontrado.
 * '409':
 * description: Conflito (ex: o pedido não está pendente).
 */
export async function POST(request, { params }) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const orderId = params.id;
  
  try {
    // 1. Buscar detalhes do pedido, do utilizador e do produto
    const [order] = await query({
      query: `
        SELECT 
            o.id, o.status, o.product_id,
            u.name as user_name, u.email as user_email,
            p.name as product_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN products p ON o.product_id = p.id
        WHERE o.id = ?;
      `,
      values: [orderId],
    });

    if (!order) {
      return new NextResponse(JSON.stringify({ message: 'Pedido não encontrado.' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (order.status !== 'pending') {
      return new NextResponse(JSON.stringify({ message: 'Só é possível enviar lembretes para pedidos pendentes.' }), 
        { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Buscar os números reservados para este pedido
    const reservedNumbersRows = await query({
        query: "SELECT number_value FROM raffle_numbers WHERE order_id = ? AND status = 'reserved'",
        values: [orderId]
    });
    const reservedNumbers = reservedNumbersRows.map(n => n.number_value);

    if (reservedNumbers.length === 0) {
        return new NextResponse(JSON.stringify({ message: 'Nenhum número reservado encontrado para este pedido pendente.' }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Montar o link de pagamento (leva de volta à página do produto)
    const paymentLink = `${process.env.APP_URL}/my-numbers/`;

    // 4. Enviar o e-mail
    await sendPaymentReminderEmail({
      userEmail: order.user_email,
      userName: order.user_name,
      productName: order.product_name,
      reservedNumbers: reservedNumbers,
      paymentLink: paymentLink,
      orderId: orderId,
    });

    return NextResponse.json({ message: 'E-mail de lembrete enviado com sucesso!'  });

  } catch (error) {
    console.error(`Erro ao enviar lembrete para pedido ${orderId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
