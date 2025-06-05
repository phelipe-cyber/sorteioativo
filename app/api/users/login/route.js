// app/api/users/login/route.js

import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Autentica um usuário
 *     description: |
 *       Realiza o login do usuário com email e senha e retorna um JSON Web Token (JWT) em caso de sucesso.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao.silva@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senhaForte123"
 *     responses:
 *       '200':
 *         description: Login bem-sucedido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login realizado com sucesso!
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: João da Silva
 *                     email:
 *                       type: string
 *                       example: joao.silva@example.com
 *       '400':
 *         description: Email ou senha não fornecidos.
 *       '401':
 *         description: Não autorizado, credenciais inválidas.
 *       '500':
 *         description: Erro interno do servidor.
 */


export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // 1. Validação de entrada
    if (!email || !password) {
      return new NextResponse(JSON.stringify({ message: `Email e senha são obrigatórios` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar o usuário no banco de dados pelo email
    const users = await query({
      query: "SELECT * FROM users WHERE email = ?",
      values: [email],
    });

    if (users.length === 0) {
      // Usuário não encontrado, mas retornamos 401 para não dar dicas a atacantes
      return new NextResponse(JSON.stringify({ message: `Credenciais inválidas` }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = users[0];

    // 3. Comparar a senha fornecida com o hash salvo no banco
    const passwordsMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordsMatch) {
      return new NextResponse(JSON.stringify({ message: `Credenciais inválidas` }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Se a senha estiver correta, gerar o JWT
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d', // O token expira em 7 dias
    });
    
    // 5. Retornar o token e os dados do usuário (sem a senha)

    return new NextResponse(JSON.stringify({ 
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
    
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ message: `Erro interno do servidor` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

