// app/api/admin/products/route.js

import { NextResponse } from 'next/server';
import { query,dbPool } from '../../../lib/db';
import { verifyAdminAuth } from '../../../lib/adminAuthMiddleware';

/**
 * @swagger
 * /api/admin/products:
 *   post:
 *     summary: Cria um novo produto (sorteio)
 *     description: |
 *       (Admin) Adiciona um novo produto e inicializa seus números de 0 a 100 como disponíveis.
 *     tags:
 *       - Admin
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
 *               - price_per_number
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rifa de um PlayStation 5"
 *               description:
 *                 type: string
 *                 example: "Concorra a um PS5 novinho em folha!"
 *               price_per_number:
 *                 type: number
 *                 format: float
 *                 example: 25.50
 *               image_url:
 *                 type: string
 *                 example: "https://example.com/ps5.jpg"
 *     responses:
 *       '201':
 *         description: Produto e números criados com sucesso.
 *       '401':
 *         description: Não autenticado.
 *       '403':
 *         description: Acesso negado, não é um administrador.
 *       '500':
 *         description: Erro interno do servidor.
 */

/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     summary: Lista todos os produtos (Admin)
 *     description: |
 *       (Admin) Retorna uma lista de todos os produtos cadastrados, independentemente do status.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Uma lista de todos os produtos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price_per_number:
 *                         type: number
 *                         format: float
 *                       image_url:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [active, upcoming, drawn, cancelled]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       winning_number:
 *                         type: integer
 *                         nullable: true
 *                       winner_user_id:
 *                         type: integer
 *                         nullable: true
 *       '401':
 *         description: Não autenticado.
 *       '403':
 *         description: Acesso negado, não é um administrador.
 *       '500':
 *         description: Erro interno do servidor.
 */


export async function POST(request) {
  // 1. Verificar se o usuário é um admin
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  let connection;
  try {
    const { name, description, price_per_number, image_url } = await request.json();

    if (!name || !price_per_number) {
      return new NextResponse(JSON.stringify({ message: `Nome e preço por número são obrigatórios` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    // 2. Inserir o novo produto
    const [productResult] = await connection.execute(
      "INSERT INTO products (name, description, price_per_number, image_url, status) VALUES (?, ?, ?, ?, 'upcoming')",
      [name, description, price_per_number, image_url]
    );
    const newProductId = productResult.insertId;

    // 3. Inserir os 101 números (0 a 100) para o novo produto
    const numbersToInsert = [];
    for (let i = 0; i <= 100; i++) {
      numbersToInsert.push([newProductId, i]);
    }
    
    await connection.query(
      "INSERT INTO raffle_numbers (product_id, number_value) VALUES ?",
      [numbersToInsert]
    );

    await connection.commit();

    return new NextResponse(JSON.stringify({ message: `Produto e números criados com sucesso!`, productId: newProductId, }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao criar produto:", error);
    return new NextResponse(JSON.stringify({ message: `Erro interno do servidor` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (connection) connection.release();
  }
};

export async function GET(request) {
  // 1. Verificar se o usuário é um admin
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  try {
    const products = await query({ 
      query: "SELECT * FROM products ORDER BY created_at DESC",
      values: [],
    });

    return new NextResponse(JSON.stringify({ products }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro ao listar produtos para admin:", error);
    return new NextResponse(JSON.stringify({ message: `Erro interno do servidor ao listar produtos` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}