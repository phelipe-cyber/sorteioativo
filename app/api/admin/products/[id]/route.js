// app/api/admin/products/[id]/route.js

import { NextResponse } from 'next/server';
import { dbPool, query } from '@/app/lib/db'; // Ajuste o caminho se necessário
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

// A função GET para buscar um produto específico precisa retornar também o total_numbers
export async function GET(request, { params }) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const productId = params.id;
  try {
    const [productRows] = await query({
      query: "SELECT id, name, description, price_per_number, image_url, status, total_numbers FROM products WHERE id = ?",
      values: [productId],
    });
    if (productRows.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'Produto não encontrado.' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return NextResponse.json(productRows[0]);
  } catch (error) {
    console.error(`Erro ao buscar produto ${productId} (Admin GET):`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao buscar produto.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// PUT: Atualizar dados de um produto específico, incluindo total_numbers
export async function PUT(request, { params }) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const productId = params.id;
  let connection;
  try {
    const { name, description, price_per_number, image_url, status, total_numbers } = await request.json();

    // Validações
    if (!name || price_per_number === undefined || !status || total_numbers === undefined) {
      return new NextResponse(JSON.stringify({ message: 'Nome, preço, status e último número são obrigatórios.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const newLastNumber = parseInt(total_numbers, 10);
    if (isNaN(newLastNumber) || newLastNumber < 1 || newLastNumber > 10000) {
        return new NextResponse(JSON.stringify({ message: 'O último número deve ser um valor numérico entre 1 e 10.000.' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

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

    // Lógica para quando a quantidade de números é alterada
    if (existingProduct.total_numbers !== newLastNumber) {
      // Regra de negócio: Só permitir alterar a quantidade se o sorteio não estiver ativo/finalizado
      if (existingProduct.status !== 'upcoming') {
        await connection.rollback();
        return new NextResponse(JSON.stringify({ message: 'Não é possível alterar a quantidade de números para um sorteio que já está ativo, foi sorteado ou cancelado.' }), 
            { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      
      console.log(`API Admin Product (PUT): Alterando quantidade de números para produto ${productId} de ${existingProduct.total_numbers} para ${newLastNumber}.`);
      
      // 1. Deletar os números antigos
      await connection.execute("DELETE FROM raffle_numbers WHERE product_id = ?", [productId]);
      console.log(`API Admin Product (PUT): Números antigos do produto ${productId} foram deletados.`);

      // 2. Criar o novo conjunto de números
      const numbersToInsert = [];
      for (let i = 0; i <= newLastNumber; i++) {
        numbersToInsert.push([productId, i]);
      }
      if (numbersToInsert.length > 0) {
          await connection.query(
            "INSERT INTO raffle_numbers (product_id, number_value) VALUES ?",
            [numbersToInsert]
          );
          console.log(`API Admin Product (PUT): ${numbersToInsert.length} novos números inseridos para o produto ${productId}.`);
      }
    }

    // Atualizar os outros detalhes do produto na tabela products
    await connection.execute(
      "UPDATE products SET name = ?, description = ?, price_per_number = ?, image_url = ?, status = ?, total_numbers = ? WHERE id = ?",
      [name, description, parseFloat(price_per_number), image_url, status, newLastNumber, productId]
    );

    await connection.commit();
    console.log(`API Admin Product (PUT): Produto ${productId} atualizado com sucesso.`);

    const [updatedProductRows] = await query({
        query: "SELECT * FROM products WHERE id = ?",
        values: [productId]
    });

    return NextResponse.json({ message: 'Produto atualizado com sucesso!', product: updatedProductRows[0] });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Erro ao atualizar produto ${productId} (Admin PUT):`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao atualizar produto.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
  } finally {
    if (connection) connection.release();
  }
}
