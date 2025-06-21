// app/api/admin/orders/[id]/notify-success/route.js
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware';
import { createSuccessNotification, sendWhatsAppNotification } from '@/app/lib/whatsapp';
import { logToDatabase } from '@/app/lib/system-logging';

/**
 * @swagger
 * /api/admin/orders/{id}/notify-success:
 * post:
 * summary: Reenvia a notificação de pagamento aprovado (Admin)
 * description: (Admin) Busca os detalhes de um pedido completo e reenvia a notificação de sucesso para o cliente.
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
 * description: O ID do pedido completo.
 * responses:
 * '200':
 * description: Notificação de sucesso reenviada.
 * '404':
 * description: Pedido não encontrado.
 * '409':
 * description: Conflito (o pedido não está completo).
 */
export async function POST(request, { params }) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const orderId = params.id;
  let connection; // Declare connection here
  try {
    // 1. Obter todos os detalhes necessários
    const [order] = await query({
      query: `
        SELECT 
            o.id as order_id, o.status, o.user_id,
            u.name as user_name, u.phone as user_phone,
            p.name as product_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN products p ON o.product_id = p.id
        WHERE o.id = ?;
      `,
      values: [orderId],
    });

    if (!order) {
      return new NextResponse(JSON.stringify({ message: 'Pedido não encontrado.' }), { status: 404 });
    }

    if (order.status !== 'completed') {
        return new NextResponse(JSON.stringify({ message: 'Só é possível enviar notificação de sucesso para pedidos completos.' }), { status: 409 });
    }

    // 2. Buscar os números vendidos para este pedido
    const soldNumbersRows = await query({
        query: "SELECT number_value FROM raffle_numbers WHERE order_id = ? AND status = 'sold'",
        values: [orderId]
    });
    const purchasedNumbers = soldNumbersRows.map(n => n.number_value);

    // 3. Enviar a notificação via WhatsApp
    if (order.user_phone) {
        const { message, buttons } = createSuccessNotification(
            order.user_name,
            order.product_name,
            order.order_id,
            purchasedNumbers
        );
        await sendWhatsAppNotification(order.user_phone, message, buttons);
        await logToDatabase(null, 'INFO', 'admin-resend-success-notification', `Notificação de sucesso para o pedido #${orderId} reenviada pelo admin.`, null, order.user_id, order.order_id);
    } else {
        throw new Error('Este utilizador não tem um número de telefone registado.');
    }

    return NextResponse.json({ message: 'Notificação de sucesso reenviada!' });

  } catch (error) {
    console.error(`Erro ao reenviar notificação de sucesso para o pedido ${orderId}:`, error);
    return new NextResponse(JSON.stringify({ message: error.message || 'Erro interno do servidor.' }), { status: 500 });
  }
}
