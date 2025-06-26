// app/api/admin/products/[id]/route.js

import { NextResponse } from 'next/server';
import { query, dbPool} from '@/app/lib/db'; // Ajuste o caminho se necessário
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware'; // Ajuste o caminho

/**
 * @swagger
 * /api/admin/products/{id}:
 *   put:
 *     summary: Atualiza um produto existente (Admin)
 *     description: |
 *       (Admin) Altera os detalhes de um produto específico.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: O ID numérico do produto a ser atualizado.
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nova Rifa Incrível"
 *               description:
 *                 type: string
 *                 example: "Uma descrição atualizada para a rifa."
 *               price_per_number:
 *                 type: number
 *                 format: float
 *                 example: 15.75
 *               image_url:
 *                 type: string
 *                 example: "https://example.com/nova_imagem.jpg"
 *               status:
 *                 type: string
 *                 enum: [active, upcoming, drawn, cancelled]
 *                 example: "active"
 *     responses:
 *       '200':
 *         description: Produto atualizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produto atualizado com sucesso"
 *                 product:
 *                   type: object
 *                   description: Retorna o produto atualizado
 *                   # Você pode definir as propriedades do produto aqui como no GET
 *       '400':
 *         description: Dados de entrada inválidos.
 *       '401':
 *         description: Não autenticado.
 *       '403':
 *         description: Acesso negado, não é um administrador.
 *       '404':
 *         description: Produto não encontrado.
 *       '500':
 *         description: Erro interno do servidor.
 */



export async function GET(request, { params }) {
  const productId = params.id;

  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  try {
    // Consulta 1: Buscar os detalhes do produto
    const productResult = await query({
      query: "SELECT * FROM products WHERE id = ?",
      values: [productId],
    });

    if (productResult.length === 0) {
      return new NextResponse(JSON.stringify({ message: `Produto não encontrado` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const product = productResult[0];

    // Consulta 2: Buscar todos os números associados a esse produto
    const numbersResult = await query({
      query: "SELECT * FROM raffle_numbers WHERE product_id = ? ORDER BY number_value ASC",
      values: [productId],
    });

    // Retorna um objeto combinado com os detalhes do produto e a lista de números
    return new NextResponse(JSON.stringify({ 
      product,
      numbers: numbersResult, 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

   
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ message: `Erro interno do servidor` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT: Atualiza um produto existente
export async function PUT(request, { params }) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const productId = params.id;
  let connection;
  try {
    // Removido prize_type dos dados recebidos
    const { name, description, price_per_number, image_url, status, total_numbers, discount_quantity, discount_percentage } = await request.json();

    const newLastNumber = parseInt(total_numbers, 10);
    // ... (outras validações aqui, se necessário)

    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    const [existingProductRows] = await connection.execute(
      "SELECT status, total_numbers FROM products WHERE id = ? FOR UPDATE",
      [productId]
    );

    if (existingProductRows.length === 0) {
      await connection.rollback();
      return new NextResponse(JSON.stringify({ message: 'Produto não encontrado.' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    const existingProduct = existingProductRows[0];

    if (existingProduct.total_numbers !== newLastNumber) {
      if (existingProduct.status !== 'upcoming') {
        await connection.rollback();
        return new NextResponse(JSON.stringify({ message: 'Não é possível alterar a quantidade de números para um sorteio que já está ativo.' }), 
            { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      await connection.execute("DELETE FROM raffle_numbers WHERE product_id = ?", [productId]);
      const numbersToInsert = [];
      for (let i = 0; i <= newLastNumber; i++) {
        numbersToInsert.push([productId, i]);
      }
      if (numbersToInsert.length > 0) {
          await connection.query( "INSERT INTO raffle_numbers (product_id, number_value) VALUES ?", [numbersToInsert] );
      }
    }

    // Query UPDATE atualizada para remover prize_type
    await connection.execute(
      "UPDATE products SET name = ?, description = ?, price_per_number = ?, image_url = ?, status = ?, total_numbers = ?, discount_quantity = ?, discount_percentage = ? WHERE id = ?",
      [name, description, parseFloat(price_per_number), image_url, status, newLastNumber, parseInt(discount_quantity) || null, parseInt(discount_percentage) || null, productId]
    );

    await connection.commit();
    
    const [updatedProduct] = await query({
      query: "SELECT * FROM products WHERE id = ?",
      values: [productId]
    });

    return NextResponse.json({ message: 'Produto atualizado com sucesso!', product: updatedProduct });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Erro ao atualizar produto ${productId} (Admin PUT):`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao atualizar produto.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  } finally {
    if (connection) connection.release();
  }
}