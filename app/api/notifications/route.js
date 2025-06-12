// app/api/notifications/route.js
import { NextResponse } from 'next/server';
import { dbPool, query } from '@/app/lib/db'; // Ajuste o caminho se necessário
import { verifyAuth } from '@/app/lib/authMiddleware'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Busca as notificações do usuário logado
 *     description: Retorna uma lista de todas as notificações para o usuário autenticado, ordenadas das mais recentes para as mais antigas.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Sucesso. Retorna as notificações.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       message:
 *                         type: string
 *                       is_read:
 *                         type: boolean
 *                       link:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       '401':
 *         description: Não autenticado.
 *       '500':
 *         description: Erro interno do servidor.
 *   put:
 *     summary: Marca notificações como lidas
 *     description: Permite marcar uma ou todas as notificações do usuário como lidas.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Um array de IDs de notificações para marcar como lidas.
 *               mark_all_as_read:
 *                 type: boolean
 *                 description: Se verdadeiro, marca todas as notificações não lidas como lidas.
 *             example:
 *               notificationIds: [1, 2, 3]
 *               mark_all_as_read: false
 *     responses:
 *       '200':
 *         description: Notificações atualizadas com sucesso.
 *       '400':
 *         description: Requisição inválida.
 *       '401':
 *         description: Não autenticado.
 */


// GET: Busca todas as notificações para o usuário logado
export async function GET(request) {
  const authResult = await verifyAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const userId = authResult.payload.id;

  try {
    const notifications = await query({
      query: "SELECT id, message, is_read, link, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", // Limita a 50 para performance
      values: [userId],
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error(`Erro ao buscar notificações para usuário ID ${userId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro ao buscar notificações.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// PUT: Marca uma ou mais notificações como lidas
export async function PUT(request) {
  const authResult = await verifyAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const userId = authResult.payload.id;

  let connection;
  try {
    const { notificationIds, mark_all_as_read } = await request.json();

    connection = await dbPool.getConnection();
    
    if (mark_all_as_read === true) {
      // Marcar todas as não lidas como lidas
      console.log(`API Notifications (PUT): Marcando todas as notificações como lidas para o usuário ID ${userId}.`);
      await connection.execute(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
        [userId]
      );
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Marcar IDs específicos como lidos
      console.log(`API Notifications (PUT): Marcando notificações ${notificationIds.join(', ')} como lidas para o usuário ID ${userId}.`);
      const placeholders = notificationIds.map(() => '?').join(',');
      await connection.execute(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...notificationIds]
      );
    } else {
      // Nenhum dado válido fornecido
      return new NextResponse(JSON.stringify({ message: 'Requisição inválida. Forneça "notificationIds" ou "mark_all_as_read".' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    return NextResponse.json({ message: 'Notificações atualizadas com sucesso.' });

  } catch (error) {
    console.error(`Erro ao atualizar notificações para usuário ID ${userId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro ao atualizar notificações.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  } finally {
    if (connection) connection.release();
  }
}
