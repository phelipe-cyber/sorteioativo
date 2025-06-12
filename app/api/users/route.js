// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { query, dbPool } from '@/app/lib/db'; // Adicionado dbPool para consistência, embora query simples possa ser usada
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware';
import bcrypt from 'bcrypt';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lista todos os usuários cadastrados (Admin)
 *     description: >
 *       (Admin) Retorna uma lista de todos os usuários do sistema, incluindo seus IDs, nomes, emails e funções (roles).
 *     tags:
 *       - Admin - Users
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
 *   post:
 *     summary: Cria um novo usuário (Admin)
 *     description: >
 *       (Admin) Permite que um administrador crie uma nova conta de usuário, definindo nome, email, senha e função.
 *     tags:
 *       - Admin - Users
 *     security:
 *       - bearerAuth: []
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
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Novo Usuário"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "novousuario@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: "user"
 *     responses:
 *       '201':
 *         description: Usuário criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuário criado com sucesso!"
 *                 userId:
 *                   type: integer
 *       '400':
 *         description: >
 *           Dados de entrada inválidos (ex: email já existe, senha curta, role inválida).
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

  console.log('API Admin Users (GET): Buscando lista de usuários...');

  try {
    const users = await query({ // query simples é ok para GET
      query: "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC",
      values: [],
    });

    console.log(`API Admin Users (GET): ${users.length} usuários encontrados.`);
    return NextResponse.json({ users });

  } catch (error) {
    console.error("Erro ao listar usuários para admin (GET):", error);
    return new NextResponse(
        JSON.stringify({ message: 'Erro interno do servidor ao listar usuários.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request) {
  // 1. Verificar se o usuário é um admin
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  console.log('API Admin Users (POST): Iniciando criação de novo usuário...');

  let connection;
  try {
    const { name, email, password, role } = await request.json();
    console.log('API Admin Users (POST): Dados recebidos:', { name, email, role }); // Não logar senha

    // 2. Validação básica dos dados de entrada
    if (!name || !email || !password || !role) {
      return new NextResponse(JSON.stringify({ message: 'Nome, email, senha e função (role) são obrigatórios.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (password.length < 6) {
      return new NextResponse(JSON.stringify({ message: 'A senha deve ter pelo menos 6 caracteres.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!['user', 'admin'].includes(role)) {
      return new NextResponse(JSON.stringify({ message: 'A função (role) deve ser "user" ou "admin".' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    connection = await dbPool.getConnection(); // Usar pool para INSERT/UPDATE/DELETE
    await connection.beginTransaction();

    // 3. Verificar se o email já existe
    const [existingUser] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      await connection.rollback();
      return new NextResponse(JSON.stringify({ message: 'Este email já está em uso.' }), 
        { status: 409, headers: { 'Content-Type': 'application/json' } }); // 409 Conflict
    }

    // 4. Criptografar a senha
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Inserir o novo usuário no banco de dados
    const [result] = await connection.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, role]
    );
    
    const createdUserId = result.insertId;
    await connection.commit();
    console.log(`API Admin Users (POST): Usuário ID ${createdUserId} criado com sucesso.`);

    return NextResponse.json({ 
      message: 'Usuário criado com sucesso!', 
      userId: createdUserId 
    }, { status: 201 }); // 201 Created

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao criar usuário (Admin POST):", error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao criar usuário.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  } finally {
    if (connection) connection.release();
  }
}
