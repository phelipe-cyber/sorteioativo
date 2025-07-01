// app/api/admin/orders/[id]/notify-winner/route.js
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware';
import { sendWinnerNotificationEmail } from '@/app/lib/mailer';
import { createWinnerNotification, sendWhatsAppNotification } from '@/app/lib/whatsapp';

/**
 * @swagger
 * /api/admin/orders/{id}/notify-winner:
 * post:
 * summary: Reenvia a notificação para o ganhador de um sorteio (Admin)
 * description: (Admin) Envia novamente o e-mail e a notificação de WhatsApp para o utilizador que ganhou um sorteio.
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
 * description: O ID do pedido vencedor.
 * responses:
 * '200':
 * description: Notificação reenviada com sucesso.
 * '404':
 * description: Pedido não encontrado.
 * '409':
 * description: Conflito (este não é o pedido vencedor).
 */
export async function POST(request, { params }) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const orderId = params.id;

  try {
    // 1. Obter todos os detalhes necessários com um único JOIN
    const [order] = await query({
      query: `
        SELECT 
            o.id as order_id, o.user_id,
            u.name as winner_name, u.email as winner_email, u.phone as winner_phone,
            p.id as product_id, p.name as product_name, p.winning_number, p.winner_user_id
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

    // 2. Validar se este é realmente o pedido vencedor
    if (order.winner_user_id !== order.user_id || !order.winning_number) {
        return new NextResponse(JSON.stringify({ message: 'Este não é o pedido vencedor para este sorteio.' }), { status: 409 });
    }

    // 3. Enviar notificações
    // Enviar E-mail
    try {
        await sendWinnerNotificationEmail({
            winnerEmail: order.winner_email,
            winnerName: order.winner_name,
            productName: order.product_name,
            winningNumber: order.winning_number,
            orderId: order.order_id
        });
    } catch (emailError) {
        console.error(`Falha ao reenviar e-mail para ${order.winner_email}:`, emailError);
    }

    // Enviar WhatsApp
    if (order.winner_phone) {
        try {
            const { message } = createWinnerNotification(
                order.winner_name,
                order.product_name,
                order.order_id,
                order.winning_number
            );
            await sendWhatsAppNotification(order.winner_phone, message);
        } catch (whatsappError) {
            console.error(`Falha ao reenviar WhatsApp para ${order.winner_phone}:`, whatsappError);
        }
    }

    return NextResponse.json({ message: 'Notificação de ganhador reenviada com sucesso!' });

  } catch (error) {
    console.error(`Erro ao reenviar notificação para pedido ${orderId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor.' }), { status: 500 });
  }
}
