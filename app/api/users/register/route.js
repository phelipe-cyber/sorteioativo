// app/api/users/register/route.js

import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import bcrypt from 'bcrypt';

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Registra um novo usuário
 *     description: |
 *       Cria uma nova conta de usuário com nome, email e senha. O email deve ser único.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: João da Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao.silva@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senhaForte123"
 *     responses:
 *       '201':
 *         description: Usuário registrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Registro realizado com sucesso!
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
 *         description: Dados inválidos ou email já cadastrado.
 *       '500':
 *         description: Erro interno do servidor.
 */


export async function POST(request) {
  try {
    // Agora recebemos 'phone' também
    const { name, email, password, phone } = await request.json();

    // Validação dos dados
    if (!name || !email || !password || !phone) {
      return new NextResponse(JSON.stringify({ message: 'Todos os campos são obrigatórios.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (password.length < 6) {
      return new NextResponse(JSON.stringify({ message: 'A senha deve ter pelo menos 6 caracteres.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Verificar se o email já existe
    const [existingUser] = await query({
      query: "SELECT id FROM users WHERE email = ?",
      values: [email],
    });

    if (existingUser) {
      return new NextResponse(JSON.stringify({ message: 'Este email já está em uso.' }), 
        { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    // Criptografar a senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Inserir o novo usuário no banco de dados, incluindo o telefone
    const result = await query({
      query: "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'user')",
      values: [name, email, phone, passwordHash],
    });
    
    const createdUserId = result.insertId;

    return NextResponse.json({ 
      message: 'Usuário criado com sucesso!', 
      userId: createdUserId 
    }, { status: 201 });

  } catch (error) {
    console.error("Erro na API de registro:", error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao registrar usuário.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
