// app/api/cron/send-reminders/route.js
import { NextResponse } from 'next/server';
import { dbPool } from '@/app/lib/db';
import { sendPaymentReminderEmail } from '@/app/lib/mailer';
import { createReminderNotification, sendWhatsAppNotification, createCancellationNotification } from '@/app/lib/whatsapp';
import { logToDatabase } from '@/app/lib/system-logging'; // Assumindo que movemos logToDatabase para um ficheiro separado

/**
 * @swagger
 * /api/cron/send-reminders:
 * post:
 * summary: Envia lembretes para todos os pedidos pendentes (CRON)
 * description: Esta rota deve ser protegida e chamada por um serviço de cron job. Ela busca todos os pedidos pendentes e envia notificações por e-mail e WhatsApp.
 * tags:
 * - Cron
 * security:
 * - cronSecret: []
 * responses:
 * '200':
 * description: Lembretes enviados com sucesso.
 * '401':
 * description: Chave secreta de autorização inválida.
 * '500':
 * description: Erro interno do servidor.
 * components:
 * securitySchemes:
 * cronSecret:
 * type: apiKey
 * in: header
 * name: Authorization
 * description: Chave secreta no formato 'Bearer SEU_CRON_SECRET'.
 */
export async function POST(request) {
    // 1. Proteger a API com uma chave secreta
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      await logToDatabase(null, 'ERROR', 'cron-unauthorized', 'Tentativa de acesso não autorizada ao cron.');
      return new NextResponse('Não autorizado.', { status: 401 });
    }
  
    console.log('CRON: Iniciando tarefa diária de gestão de pedidos pendentes...');
    await logToDatabase(null, 'INFO', 'cron-start', 'Tarefa de gestão de pedidos pendentes iniciada.');
  
    let connection;
    let successReminderCount = 0;
    let successCancellationCount = 0;
    let failureCount = 0;
  
    try {
      connection = await dbPool.getConnection();
  
      // --- Parte 1: Cancelar pedidos pendentes antigos (ex: com mais de 48 horas) ---
      const [oldPendingOrders] = await connection.execute(`
        SELECT 
            o.id as order_id, o.user_id, o.product_id,
            u.name as user_name, u.phone as user_phone,
            p.name as product_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN products p ON o.product_id = p.id
        WHERE o.status = 'pending' AND o.created_at < NOW() - INTERVAL 48 HOUR;
      `);
  
      if (oldPendingOrders.length > 0) {
          console.log(`CRON: Encontrados ${oldPendingOrders.length} pedidos pendentes antigos para cancelar.`);
          for (const order of oldPendingOrders) {
              try {
                  await connection.beginTransaction();
                  // Mudar status da ordem para 'cancelled'
                  await connection.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [order.order_id]);
                  // Libertar os números reservados
                  await connection.execute("UPDATE raffle_numbers SET status = 'available', user_id = NULL, order_id = NULL, reserved_at = NULL WHERE order_id = ? AND status = 'reserved'", [order.order_id]);
                  await connection.commit();
  
                  // Enviar notificação de cancelamento
                  if (order.user_phone) {
                      const { message, buttons } = createCancellationNotification(order.user_name, order.product_name, order.order_id);
                      await sendWhatsAppNotification(order.user_phone, message, buttons);
                  }
                  await logToDatabase(connection, 'INFO', 'cron-order-cancelled', `Pedido #${order.order_id} cancelado por inatividade.`, null, order.user_id, order.order_id);
                  successCancellationCount++;
              } catch (cancelError) {
                  await connection.rollback();
                  console.error(`CRON: Falha ao cancelar o pedido #${order.order_id}:`, cancelError);
                  await logToDatabase(connection, 'ERROR', 'cron-cancel-failed', `Falha ao cancelar o pedido #${order.order_id}`, { error: cancelError.message }, order.user_id, order.order_id);
                  failureCount++;
              }
          }
      }
  
  
      // --- Parte 2: Enviar lembretes para pedidos pendentes recentes (ex: entre 12 e 36 horas) ---
      const [recentPendingOrders] = await connection.execute(`
        SELECT 
            o.id as order_id, o.product_id,
            u.name as user_name, u.email as user_email, u.phone as user_phone, u.id as user_id,
            p.name as product_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN products p ON o.product_id = p.id
        WHERE o.status = 'pending' AND o.created_at BETWEEN NOW() - INTERVAL 36 HOUR AND NOW() - INTERVAL 12 HOUR;
      `);
  
      if (recentPendingOrders.length > 0) {
          console.log(`CRON: Encontrados ${recentPendingOrders.length} pedidos pendentes recentes para enviar lembrete.`);
          for (const order of recentPendingOrders) {
              try {
                  // A lógica para enviar lembrete continua a mesma...
                  const [reservedNumbersRows] = await connection.execute("SELECT number_value FROM raffle_numbers WHERE order_id = ? AND status = 'reserved'", [order.order_id]);
                  const reservedNumbers = reservedNumbersRows.map(n => n.number_value);
                  if (reservedNumbers.length > 0) {
                      const paymentLink = `${process.env.APP_URL}/my-numbers`;
                      await sendPaymentReminderEmail({
                        userEmail: order.user_email,
                        userName: order.user_name,
                        productName: order.product_name,
                        reservedNumbers: reservedNumbers,
                        paymentLink: paymentLink,
                        orderId: order.order_id,
                      });
                      if (order.user_phone) {
                          const { message, buttons } = createReminderNotification(order.user_name, order.product_name, order.order_id, reservedNumbers, paymentLink);
                          await sendWhatsAppNotification(order.user_phone, message, buttons);
                      }
                      await logToDatabase(connection, 'INFO', 'cron-reminder-sent', `Lembrete enviado para o pedido #${order.order_id}`, null, order.user_id, order.order_id);
                      successReminderCount++;
                  }
              } catch (reminderError) {
                  console.error(`CRON: Falha ao enviar lembrete para o pedido #${order.order_id}:`, reminderError);
                  await logToDatabase(connection, 'ERROR', 'cron-reminder-failed', `Falha ao processar o lembrete para o pedido #${order.order_id}`, { error: reminderError.message }, order.user_id, order.order_id);
                  failureCount++;
              }
          }
      }
  
  
      const finalMessage = `Tarefa concluída. Cancelamentos: ${successCancellationCount}. Lembretes: ${successReminderCount}. Falhas: ${failureCount}.`;
      console.log(`CRON: ${finalMessage}`);
      await logToDatabase(null, 'INFO', 'cron-finish', finalMessage, { successCancellationCount, successReminderCount, failureCount });
      return NextResponse.json({ message: finalMessage });
  
    } catch (error) {
      console.error("Erro crítico na tarefa de cron:", error);
      await logToDatabase(null, 'ERROR', 'cron-critical-error', 'Erro fatal na execução da tarefa de cron.', { error: error.message });
      return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor na tarefa de cron.' }), { status: 500 });
    } finally {
        if (connection) connection.release();
    }
  }
  