// app/api/admin/orders/[id]/remind/route.js

import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db'; // Ajuste o caminho
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware'; // Ajuste o caminho
import { sendPaymentReminderEmail } from '@/app/lib/mailer'; // Ajuste o caminho
import { createReminderNotification, sendWhatsAppNotification } from '@/app/lib/whatsapp'; // Importar utilitários do WhatsApp

/**
 * @swagger
 * /api/admin/orders/{id}/remind:
 *   post:
 *     summary: Envia um e-mail de lembrete para um pedido pendente (Admin)
 *     description: "(Admin) Busca os detalhes de um pedido pendente e envia um e-mail de lembrete para o cliente."
 *     tags:
 *       - Admin - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: "E-mail de lembrete enviado com sucesso."
 *         content:
 *           application/json:
 *             example:
 *               message: "E-mail de lembrete enviado para o cliente com sucesso."
 *       '404':
 *         description: "Pedido não encontrado."
 *         content:
 *           application/json:
 *             example:
 *               error: "Pedido com ID 123 não encontrado."
 *       '409':
 *         description: "Conflito (ex: o pedido não está pendente)."
 *         content:
 *           application/json:
 *             example:
 *               error: "O pedido já foi concluído e não pode receber lembrete."
 */


export async function POST(request, { params }) {
  console.log("--- INÍCIO: API /remind ---");
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const orderId = params.id;
  console.log(`API Remind: Tentando enviar lembrete para o pedido ID: ${orderId}`);
  
  try {
    // 1. Buscar detalhes do pedido, do utilizador e do produto
    console.log("API Remind: Buscando dados do pedido no banco...");
    const [order] = await query({
      query: `
          SELECT 
          o.id, o.status, o.product_id,
          u.name as user_name, u.email as user_email, u.phone as user_phone,
          p.name as product_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?;
      `,
      values: [orderId],
    });

    if (!order) {
      console.error(`API Remind: Pedido ${orderId} não encontrado.`);
      return new NextResponse(JSON.stringify({ message: 'Pedido não encontrado.' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    console.log(`API Remind: Dados do pedido ${orderId} encontrados. Status: ${order.status}`);

    if (order.status !== 'pending') {
      console.warn(`API Remind: Pedido ${orderId} não está pendente.`);
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
        console.warn(`API Remind: Nenhum número reservado encontrado para o pedido ${orderId}.`);
        return new NextResponse(JSON.stringify({ message: 'Nenhum número reservado encontrado para este pedido pendente.' }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    console.log(`API Remind: Números reservados encontrados: ${reservedNumbers.join(', ')}`);

    // Montar o link de pagamento
    const paymentLink = `${process.env.APP_URL}/products/${order.product_id}`;

      // 2. Enviar o e-mail
      await sendPaymentReminderEmail({
        userEmail: order.user_email,
        userName: order.user_name,
        productName: order.product_name,
        reservedNumbers: reservedNumbers,
        paymentLink: paymentLink,
        orderId: order.id,
      });
  
      // 3. Enviar a notificação do WhatsApp
      if (order.user_phone) {
          const { message } = createReminderNotification(
              order.user_name,
              order.product_name,
              order.id,
              reservedNumbers,
              paymentLink
          );
          await sendWhatsAppNotification(order.user_phone, message);
      } else {
          console.warn(`Utilizador do pedido ${orderId} não possui número de telefone para notificação via WhatsApp.`);
      }
  
      return NextResponse.json({ message: 'Lembretes de E-mail e WhatsApp enviados com sucesso!' });

    // return NextResponse.json({ message: 'E-mail de lembrete enviado com sucesso!' });

  } catch (error) {
    console.error(`Erro ao enviar lembrete para o pedido ${orderId}:`, error);
    return new NextResponse(JSON.stringify({ message: `Erro interno do servidor: ${error.message}` }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
