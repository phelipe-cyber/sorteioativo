// app/api/admin/products/route.js

import { NextResponse } from 'next/server';
import { query,dbPool } from '@/app/lib/db';
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware';

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


export async function GET(request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  try {
    const products = await query({ 
      // --- CORREÇÃO AQUI: Adicionado LEFT JOIN para buscar o nome do ganhador ---
      query: `
        SELECT 
            p.*,
            u.name as winner_name 
        FROM products p
        LEFT JOIN users u ON p.winner_user_id = u.id
        ORDER BY p.created_at DESC
      `,
      values: [],
    });

    return NextResponse.json({ products });

  } catch (error) {
    console.error("Erro ao listar produtos para admin:", error);
    return new NextResponse(JSON.stringify({ message: `Erro interno do servidor ao listar produtos` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


// POST: Cria um novo produto
export async function POST(request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  let connection;
  try {
    const { name, description, price_per_number, image_url, total_numbers, discount_quantity, discount_percentage } = await request.json();

    // Validações
    if (!name || price_per_number === undefined || total_numbers === undefined) {
      return new NextResponse(JSON.stringify({ message: 'Nome, preço e último número são obrigatórios.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const lastNumber = parseInt(total_numbers, 10);
    if (isNaN(lastNumber) || lastNumber < 1) {
        return new NextResponse(JSON.stringify({ message: 'O último número deve ser um valor numérico válido e maior que zero.' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    // --- CORREÇÃO NA QUERY INSERT ---
    // A query agora tem o número correto de colunas (sem slug) e de placeholders.
    // O valor 'upcoming' para o status é passado no array de valores.
    const [productResult] = await connection.execute(
      "INSERT INTO products (name, description, price_per_number, image_url, status, total_numbers, discount_quantity, discount_percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, description, parseFloat(price_per_number), image_url, 'upcoming', lastNumber, parseInt(discount_quantity) || null, parseInt(discount_percentage) || null]
    );
    const newProductId = productResult.insertId;
    console.log(`API Admin Create Product: Produto ID ${newProductId} criado com sucesso.`);

    // Inserir os números do sorteio
    const numbersToInsert = [];
    for (let i = 0; i <= lastNumber; i++) {
      numbersToInsert.push([newProductId, i]);
    }
    if (numbersToInsert.length > 0) {
        await connection.query("INSERT INTO raffle_numbers (product_id, number_value) VALUES ?", [numbersToInsert]);
    }

    await connection.commit();

    return NextResponse.json({
      message: 'Produto e números criados com sucesso!',
      productId: newProductId,
    }, { status: 201 });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao criar produto (Admin POST):", error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao criar produto.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  } finally {
    if (connection) connection.release();
  }
}