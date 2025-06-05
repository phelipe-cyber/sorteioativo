// app/api/admin/products/[id]/route.js

import { NextResponse } from 'next/server';
import { query } from '../../../lib/db'; // Ajuste o caminho se necessário
import { verifyAdminAuth } from 'lib/adminAuthMiddleware'; // Ajuste o caminho

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


export async function PUT(request, { params }) {
  // 1. Verificar se o usuário é um admin
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const productId = params.id;

  try {
    const { name, description, price_per_number, image_url, status } = await request.json();

    // Validação básica (pode ser mais robusta)
    if (!name || !price_per_number || !status) {
      return new NextResponse(
        JSON.stringify({ message: 'Nome, preço por número e status são obrigatórios.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!['active', 'upcoming', 'drawn', 'cancelled'].includes(status)) {
        return new NextResponse(
            JSON.stringify({ message: 'Status inválido.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }


    // 2. Verificar se o produto existe
    const [existingProduct] = await query({
      query: "SELECT * FROM products WHERE id = ?",
      values: [productId],
    });

    if (!existingProduct) {
      return new NextResponse(
        JSON.stringify({ message: 'Produto não encontrado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Atualizar o produto no banco de dados
    const result = await query({
      query: `
        UPDATE products 
        SET name = ?, description = ?, price_per_number = ?, image_url = ?, status = ?
        WHERE id = ?
      `,
      values: [name, description, parseFloat(price_per_number), image_url, status, productId],
    });

    if (result.affectedRows === 0) {
        // Isso não deveria acontecer se a verificação de existência passou, mas é uma segurança
        return new NextResponse(
            JSON.stringify({ message: 'Produto não encontrado para atualização.' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
    }

    // 4. Buscar o produto atualizado para retornar (opcional, mas bom para feedback)
    const [updatedProduct] = await query({
        query: "SELECT * FROM products WHERE id = ?",
        values: [productId],
      });

    return NextResponse.json({ message: 'Produto atualizado com sucesso', product: updatedProduct });

  } catch (error) {
    console.error("Erro ao atualizar produto (admin):", error);
    return new NextResponse(
        JSON.stringify({ message: 'Erro interno do servidor ao atualizar produto.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}