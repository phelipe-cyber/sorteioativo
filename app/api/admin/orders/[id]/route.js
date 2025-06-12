// app/api/admin/orders/[id]/route.js
import { NextResponse } from 'next/server';
import { query, dbPool } from '@/app/lib/db';
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware';

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Obtém os detalhes de um pedido específico (Admin)
 *     description: (Admin) Retorna os detalhes completos de um pedido, incluindo números associados.
 *     tags:
 *       - Admin - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Detalhes do pedido.
 *       '404':
 *         description: Pedido não encontrado.
 *   put:
 *     summary: Atualiza o status de um pedido (Admin)
 *     description: (Admin) Permite alterar o status de um pedido. Se um pedido pendente for alterado para 'completed', os números reservados serão marcados como 'sold'. Se alterado para 'failed' ou 'cancelled', serão libertados.
 *     tags:
 *       - Admin - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed, cancelled]
 *     responses:
 *       '200':
 *         description: Pedido atualizado com sucesso.
 *       '400':
 *         description: Status inválido.
 *       '409':
 *         description: Conflito, o pedido já foi processado ou está num estado que não permite alteração.
 */
export async function GET(request, { params }) {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthenticated) {
      return authResult.error;
    }
    const orderId = params.id;
    try {
      const [order] = await query({
        query: `
          SELECT 
              o.id, o.total_amount, o.status, o.prize_choice, o.created_at, o.payment_details,
              u.id as user_id, u.name as user_name, u.email as user_email,
              p.id as product_id, p.name as product_name
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          LEFT JOIN products p ON o.product_id = p.id
          WHERE o.id = ?;
        `,
        values: [orderId],
      });
      if (!order) {
        return new NextResponse(JSON.stringify({ message: 'Pedido não encontrado.' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      const numbers = await query({
          query: "SELECT number_value, status FROM raffle_numbers WHERE order_id = ?",
          values: [orderId]
      });
      return NextResponse.json({ order, numbers });
    } catch (error) {
      console.error(`Erro ao buscar pedido ${orderId} (Admin GET):`, error);
      return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor.' }), 
          { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  export async function PUT(request, { params }) {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthenticated) {
      return authResult.error;
    }
    const orderId = params.id;
    let connection;
    try {
      const { status: newStatus } = await request.json();
      if (!['pending', 'completed', 'failed', 'cancelled'].includes(newStatus)) {
        return new NextResponse(JSON.stringify({ message: 'Status inválido.' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
  
      connection = await dbPool.getConnection();
      await connection.beginTransaction();
      const [orderRows] = await connection.execute("SELECT status FROM orders WHERE id = ? FOR UPDATE", [orderId]);
      if (orderRows.length === 0) {
        await connection.rollback();
        return new NextResponse(JSON.stringify({ message: 'Pedido não encontrado.' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      const currentStatus = orderRows[0].status;
  
      await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [newStatus, orderId]);
  
      // Se o pedido era pendente e foi alterado para 'completed' pelo admin
      if (currentStatus === 'pending' && newStatus === 'completed') {
          const [updateSoldResult] = await connection.execute(
              "UPDATE raffle_numbers SET status = 'sold', reserved_at = NULL WHERE order_id = ? AND status = 'reserved'",
              [orderId]
          );
          console.log(`API Admin Orders (PUT): ${updateSoldResult.affectedRows} números para o pedido ${orderId} marcados como 'sold'.`);
      } 
      // Se o pedido era pendente e foi cancelado/falhou, libertar os números
      else if (currentStatus === 'pending' && ['failed', 'cancelled'].includes(newStatus)) {
          const [releaseResult] = await connection.execute(
              "UPDATE raffle_numbers SET status = 'available', user_id = NULL, order_id = NULL, reserved_at = NULL WHERE order_id = ? AND status = 'reserved'",
              [orderId]
          );
          console.log(`API Admin Orders (PUT): ${releaseResult.affectedRows} números libertados para o pedido cancelado ${orderId}.`);
      }
  
      await connection.commit();
      return NextResponse.json({ message: 'Status do pedido atualizado com sucesso.' });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error(`Erro ao atualizar pedido ${orderId} (Admin PUT):`, error);
      return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor.' }), 
          { status: 500, headers: { 'Content-Type': 'application/json' } });
    } finally {
      if (connection) connection.release();
    }
  }
  