// app/api/users/change-password/route.js
import { NextResponse } from 'next/server';
import { dbPool } from '@/app/lib/db';
import { verifyAuth } from '@/app/lib/authMiddleware';
import bcrypt from 'bcrypt';

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     summary: Altera a senha do utilizador autenticado
 *     description: "Permite que um utilizador logado altere a sua própria senha fornecendo a senha atual e a nova."
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: "A senha atual do utilizador para verificação."
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: "A nova senha desejada."
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: "Confirmação da nova senha."
 *     responses:
 *       '200':
 *         description: "Senha alterada com sucesso."
 *       '400':
 *         description: "Dados inválidos (ex: senhas não coincidem)."
 *       '401':
 *         description: "Não autenticado."
 *       '403':
 *         description: "Acesso negado (ex: senha atual incorreta)."
 *       '500':
 *         description: "Erro interno do servidor."
 */

export async function POST(request) {
    const authResult = await verifyAuth(request);
    if (!authResult.isAuthenticated) {
        return authResult.error;
    }
    const userId = authResult.payload.id;

    let connection;
    try {
        const { currentPassword, newPassword, confirmPassword } = await request.json();

        if (!currentPassword || !newPassword || !confirmPassword) {
            return new NextResponse(JSON.stringify({ message: 'Todos os campos são obrigatórios.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (newPassword !== confirmPassword) {
            return new NextResponse(JSON.stringify({ message: 'A nova senha e a confirmação não coincidem.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (newPassword.length < 6) {
            return new NextResponse(JSON.stringify({ message: 'A nova senha deve ter pelo menos 6 caracteres.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        connection = await dbPool.getConnection();
        
        // Buscar a senha atual do utilizador
        const [userRows] = await connection.execute("SELECT password_hash FROM users WHERE id = ?", [userId]);
        
        if (userRows.length === 0) {
            return new NextResponse(JSON.stringify({ message: 'Utilizador não encontrado.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        
        const user = userRows[0];

        // Verificar se a senha atual está correta
        const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isCurrentPasswordCorrect) {
            return new NextResponse(JSON.stringify({ message: 'A senha atual está incorreta.' }), { status: 403, headers: { 'Content-Type': 'application/json' } }); // Forbidden
        }

        // Criptografar a nova senha
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Atualizar a senha no banco de dados
        await connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId]);

        return NextResponse.json({ message: 'Senha alterada com sucesso!' });

    } catch (error) {
        console.error("Erro na API change-password:", error);
        return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao alterar a senha.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    } finally {
        if(connection) connection.release();
    }
}
