// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../lib/db'; // Ajuste o caminho se necessário
import { verifyAdminAuth } from '../../../lib/adminAuthMiddleware'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lista todos os usuários cadastrados (Admin)
 *     description: (Admin) Retorna uma lista de todos os usuários do sistema, incluindo seus IDs, nomes, emails e funções (roles).
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Uma lista de usuários.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [user, admin]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       '401':
 *         description: Não autenticado.
 *       '403':
 *         description: Acesso negado, não é um administrador.
 *       '500':
 *         description: Erro interno do servidor.
 */
export async function GET(request) {
  // 1. Verificar se o usuário é um admin
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  console.log('API Admin Users: Buscando lista de usuários...');

  try {
    const users = await query({
      // Selecionamos os campos relevantes, excluindo password_hash
      query: "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC",
      values: [],
    });

    console.log(`API Admin Users: ${users.length} usuários encontrados.`);
    return NextResponse.json({ users });

  } catch (error) {
    console.error("Erro ao listar usuários para admin:", error);
    return new NextResponse(
        JSON.stringify({ message: 'Erro interno do servidor ao listar usuários.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
