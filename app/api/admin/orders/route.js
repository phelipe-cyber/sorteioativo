// app/api/admin/orders/route.js
import { NextResponse } from 'next/server';
import { query, dbPool } from '@/app/lib/db';
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware';

/**
 * @swagger
 * /api/admin/orders:
 * get:
 * summary: Lista todos os pedidos do sistema (Admin)
 * description: (Admin) Retorna uma lista de todos os pedidos, juntando informações do utilizador e do produto.
 * tags:
 * - Admin - Orders
 * security:
 * - bearerAuth: []
 * responses:
 * '200':
 * description: Uma lista de todos os pedidos.
 * '401':
 * description: Não autenticado.
 * '403':
 * description: Acesso negado.
 * post:
 * summary: Marca uma ordem como completa (Admin)
 * description: (Admin) Altera o status de uma ordem para 'completed' e o status dos seus números de 'reserved' para 'sold'. Útil para confirmar pagamentos manuais.
 * tags:
 * - Admin - Orders
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - orderId
 * properties:
 * orderId:
 * type: integer
 * description: O ID da ordem a ser marcada como completa.
 * responses:
 * '200':
 * description: Ordem atualizada com sucesso.
 * '400':
 * description: ID da ordem não fornecido.
 * '404':
 * description: Ordem não encontrada.
 * '409':
 * description: Conflito, a ordem não pode ser marcada como completa (ex: não está pendente).
 */
export async function GET(request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  try {
    const orders = await query({
      query: `
        SELECT 
            o.id, o.total_amount, o.status, o.prize_choice, o.created_at,
            u.name as user_name, u.email as user_email,
            p.id as product_id, p.name as product_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN products p ON o.product_id = p.id
        ORDER BY o.created_at DESC
        LIMIT 200;
      `,
      values: [],
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Erro ao listar pedidos (Admin GET):", error);
    return new NextResponse(
        JSON.stringify({ message: 'Erro interno do servidor ao listar pedidos.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// --- NOVO MÉTODO POST PARA COMPLETAR UMA ORDEM ---
export async function POST(request) {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthenticated) {
      return authResult.error;
    }
  
    let connection;
    try {
      const { orderId } = await request.json();
  
      if (!orderId) {
        return new NextResponse(JSON.stringify({ message: 'O ID da ordem é obrigatório.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
  
      connection = await dbPool.getConnection();
      await connection.beginTransaction();
  
      // Verificar status atual da ordem
      const [orderRows] = await connection.execute("SELECT status FROM orders WHERE id = ? FOR UPDATE", [orderId]);
      if (orderRows.length === 0) {
        await connection.rollback();
        return new NextResponse(JSON.stringify({ message: 'Ordem não encontrada.' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      
      const currentStatus = orderRows[0].status;
      if (currentStatus !== 'pending' && currentStatus !== 'reserved') {
          await connection.rollback();
          return new NextResponse(JSON.stringify({ message: `A ordem não pode ser marcada como completa pois seu status atual é '${currentStatus}'.` }), {
            status: 409, headers: { 'Content-Type': 'application/json' },
          });
      }

      // 1. Atualizar o status da ordem para 'completed'
      await connection.execute(
        "UPDATE orders SET status = 'completed' WHERE id = ?",
        [orderId]
      );
  
      // 2. Atualizar os números de 'reserved' para 'sold'
      const [updateNumbersResult] = await connection.execute(
        "UPDATE raffle_numbers SET status = 'sold', reserved_at = NULL WHERE order_id = ? AND status = 'reserved'",
        [orderId]
      );
      
      console.log(`API Admin Orders (POST): ${updateNumbersResult.affectedRows} números para a ordem ${orderId} marcados como 'sold'.`);
  
      await connection.commit();
  
      return NextResponse.json({ message: `Ordem ${orderId} e seus números foram marcados como completos/vendidos.` });
  
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Erro ao completar ordem (Admin POST):", error);
      return new NextResponse(
          JSON.stringify({ message: 'Erro interno do servidor ao completar a ordem.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      if (connection) connection.release();
    }
}
