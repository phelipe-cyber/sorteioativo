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
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return new NextResponse(JSON.stringify({ message: `Nome, email e senha são obrigatórios` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingUser = await query({
      query: "SELECT * FROM users WHERE email = ?",
      values: [email],
    });

    if (existingUser.length > 0) {
      return new NextResponse(JSON.stringify({ message: `Este email já está em uso` }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query({
      query: "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      values: [name, email, passwordHash],
    });
    
    const createdUserId = result.insertId;
    
    return new NextResponse(JSON.stringify({
      message: `Usuário criado com sucesso!`,
      userId: createdUserId 
    }),{
      status: 201,
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