// app/api/users/reset-password/route.js
import { NextResponse } from 'next/server';
import { dbPool } from '@/app/lib/db'; // Ajuste o caminho se necessário
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary: Redefine a senha de um utilizador
 *     description: "Utiliza um token de redefinição para definir uma nova senha para a conta do utilizador."
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: "O token de redefinição recebido por e-mail."
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: "A nova senha do utilizador."
 *     responses:
 *       '200':
 *         description: "Senha redefinida com sucesso."
 *       '400':
 *         description: "Dados inválidos (ex: token inválido ou expirado, senha curta)."
 *       '500':
 *         description: "Erro interno do servidor."
 */


export async function POST(request) {
    let connection;
    try {
        const { token, password, confirmPassword } = await request.json();

        if (!token || !password || !confirmPassword) {
            return new NextResponse(JSON.stringify({ message: 'Todos os campos são obrigatórios.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (password !== confirmPassword) {
            return new NextResponse(JSON.stringify({ message: 'As senhas não coincidem.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (password.length < 6) {
            return new NextResponse(JSON.stringify({ message: 'A senha deve ter pelo menos 6 caracteres.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Fazer o hash do token recebido para compará-lo com o que está no banco de dados
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // Encontrar o token no banco que não tenha expirado
        const [tokenRows] = await connection.execute(
            "SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
            [hashedToken]
        );

        if (tokenRows.length === 0) {
            await connection.rollback();
            return new NextResponse(JSON.stringify({ message: 'Token inválido ou expirado. Por favor, solicite um novo link de redefinição.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const tokenRow = tokenRows[0];
        const userId = tokenRow.user_id;

        // Criptografar a nova senha
        const newPasswordHash = await bcrypt.hash(password, 10);

        // Atualizar a senha do utilizador
        await connection.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [newPasswordHash, userId]
        );

        // Deletar o token de redefinição após o uso para que não possa ser reutilizado
        await connection.execute("DELETE FROM password_reset_tokens WHERE id = ?", [tokenRow.id]);
        
        await connection.commit();

        return NextResponse.json({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
        if(connection) await connection.rollback();
        console.error("Erro na API reset-password:", error);
        return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao redefinir a senha.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    } finally {
        if(connection) connection.release();
    }
}
