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
      // Adicionado total_numbers à query de listagem para consistência
      query: "SELECT id, name, description, price_per_number, image_url, status, created_at, winning_number, winner_user_id, total_numbers FROM products ORDER BY created_at DESC",
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

export async function POST(request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  let connection;
  try {
    // --- RECEBER O NOVO CAMPO total_numbers ---
    const { name, description, price_per_number, image_url, total_numbers } = await request.json();

    // --- VALIDAÇÃO DOS DADOS ---
    if (!name || price_per_number === undefined || total_numbers === undefined) {
      return NextResponse.json({ message: 'Nome, preço por número e último número são obrigatórios.' }, { status: 400 });
    }

    const lastNumber = parseInt(total_numbers, 10);
    if (isNaN(lastNumber) || lastNumber < 1 || lastNumber > 10000) { // Adiciona um limite razoável
        return NextResponse.json({ message: 'O último número deve ser um valor numérico entre 1 e 10.000.' }, { status: 400 });
    }

    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    // Inserir o novo produto com total_numbers
    // Certifique-se de que a coluna 'total_numbers' exista na sua tabela 'products'
    const [productResult] = await connection.execute(
      "INSERT INTO products (name, description, price_per_number, image_url, status, total_numbers) VALUES (?, ?, ?, ?, 'upcoming', ?)",
      [name, description, price_per_number, image_url, lastNumber]
    );
    const newProductId = productResult.insertId;
    console.log(`API Admin Create Product: Produto ID ${newProductId} criado.`);

    // --- USAR lastNumber PARA GERAR OS NÚMEROS ---
    const numbersToInsert = [];
    for (let i = 0; i <= lastNumber; i++) { // O loop agora vai de 0 até o número fornecido
      numbersToInsert.push([newProductId, i]);
    }
    
    // Inserção em lote na tabela raffle_numbers
    if (numbersToInsert.length > 0) {
        await connection.query(
          "INSERT INTO raffle_numbers (product_id, number_value) VALUES ?",
          [numbersToInsert]
        );
        console.log(`API Admin Create Product: ${numbersToInsert.length} números inseridos para o produto ID ${newProductId}.`);
    }

    await connection.commit();

    return NextResponse.json({
      message: 'Produto e números criados com sucesso!',
      productId: newProductId,
    }, { status: 201 });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao criar produto (Admin POST):", error);
    return NextResponse.json({ message: 'Erro interno do servidor ao criar produto.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
