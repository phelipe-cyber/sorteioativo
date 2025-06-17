// app/api/admin/logs/route.js
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db'; // Ajuste o caminho se necessário
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/admin/logs:
 * get:
 * summary: Consulta os logs do sistema (Admin)
 * description: (Admin) Retorna uma lista de logs, permitindo filtrar por user_id e/ou order_id.
 * tags:
 * - Admin - Logs
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: userId
 * schema:
 * type: integer
 * description: Filtra os logs por um ID de utilizador específico.
 * - in: query
 * name: orderId
 * schema:
 * type: integer
 * description: Filtra os logs por um ID de pedido específico.
 * responses:
 * '200':
 * description: Uma lista de logs que correspondem aos filtros.
 * '401':
 * description: Não autenticado.
 * '403':
 * description: Acesso negado.
 */
export async function GET(request) {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthenticated) {
      return authResult.error;
    }
  
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const orderId = searchParams.get('orderId');
  
    try {
      let baseQuery = `
        SELECT 
          l.id, l.level, l.context, l.message, l.payload, l.created_at,
          l.user_id, u.name as user_name, u.email as user_email,
          l.order_id
        FROM system_logs l
        LEFT JOIN users u ON l.user_id = u.id
      `;
      
      const whereClauses = [];
      const values = [];
  
      if (userId) {
        whereClauses.push("l.user_id = ?");
        values.push(userId);
      }
      if (orderId) {
        whereClauses.push("l.order_id = ?");
        values.push(orderId);
      }
  
      if (whereClauses.length > 0) {
        baseQuery += " WHERE " + whereClauses.join(" AND ");
      }
  
      baseQuery += " ORDER BY l.created_at DESC LIMIT 100";
  
      const logs = await query({
        query: baseQuery,
        values,
      });
  
      if (logs.length === 0) {
          return NextResponse.json({ logs: [] });
      }
  
      // Buscar os números associados a todos os pedidos encontrados nos logs
      const orderIdsFromLogs = [...new Set(logs.map(log => log.order_id).filter(id => id != null))];
  
      let numbersByOrderId = {};
  
      if (orderIdsFromLogs.length > 0) {
          const placeholders = orderIdsFromLogs.map(() => '?').join(',');
          const numbers = await query({
              query: `SELECT order_id, number_value FROM raffle_numbers WHERE order_id IN (${placeholders}) ORDER BY number_value ASC`,
              values: orderIdsFromLogs,
          });
  
          // Agrupar números por order_id
          numbersByOrderId = numbers.reduce((acc, num) => {
              if (!acc[num.order_id]) {
                  acc[num.order_id] = [];
              }
              acc[num.order_id].push(num.number_value);
              return acc;
          }, {});
      }
      
      // Adicionar os números a cada objeto de log
      const logsWithNumbers = logs.map(log => ({
          ...log,
          associatedNumbers: numbersByOrderId[log.order_id] || [],
      }));
  
      return NextResponse.json({ logs: logsWithNumbers });
  
    } catch (error) {
      console.error("Erro ao consultar logs (Admin GET):", error);
      return new NextResponse(
          JSON.stringify({ message: 'Erro interno do servidor ao consultar logs.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  