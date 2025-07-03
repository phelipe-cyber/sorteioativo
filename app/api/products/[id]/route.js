// app/api/products/[id]/route.js

import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db'; // Ajuste o caminho

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Retorna os detalhes de um produto específico e seus números
 *     description: |
 *       Busca os detalhes de um produto pelo seu ID, juntamente com a lista completa de seus números e seus respectivos status (disponível, vendido, etc.).
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: O ID numérico do produto.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Detalhes do produto e a lista de números.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     price_per_number:
 *                       type: number
 *                     numbers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           number_value:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           user_id:
 *                             type: integer
 *                             nullable: true
 *       '404':
 *         description: Produto não encontrado.
 *       '500':
 *         description: Erro interno do servidor.
 */



export async function GET(request, { params }) {
  const productId = params.id;

  try {
    // Consulta 1: Buscar os detalhes do produto
    const productResult = await query({
      query: "SELECT * FROM products WHERE id = ? and status = 'active'",
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

// export async function PUT(request, { params }) {
//   // 1. Verificar se o usuário é um admin
//   const authResult = await verifyAdminAuth(request);
//   if (!authResult.isAuthenticated) {
//     return authResult.error;
//   }

//   const productId = params.id;

//   try {
//     const { name, description, price_per_number, image_url, status } = await request.json();

//     // Validação básica (pode ser mais robusta)
//     if (!name || !price_per_number || !status) {
//       return new NextResponse(
//         JSON.stringify({ message: 'Nome, preço por número e status são obrigatórios.' }),
//         { status: 400, headers: { 'Content-Type': 'application/json' } }
//       );
//     }
//     if (!['active', 'upcoming', 'drawn', 'cancelled'].includes(status)) {
//         return new NextResponse(
//             JSON.stringify({ message: 'Status inválido.' }),
//             { status: 400, headers: { 'Content-Type': 'application/json' } }
//         );
//     }


//     // 2. Verificar se o produto existe
//     const [existingProduct] = await query({
//       query: "SELECT * FROM products WHERE id = ?",
//       values: [productId],
//     });

//     if (!existingProduct) {
//       return new NextResponse(
//         JSON.stringify({ message: 'Produto não encontrado.' }),
//         { status: 404, headers: { 'Content-Type': 'application/json' } }
//       );
//     }

//     // 3. Atualizar o produto no banco de dados
//     const result = await query({
//       query: `
//         UPDATE products 
//         SET name = ?, description = ?, price_per_number = ?, image_url = ?, status = ?
//         WHERE id = ?
//       `,
//       values: [name, description, parseFloat(price_per_number), image_url, status, productId],
//     });

//     if (result.affectedRows === 0) {
//         // Isso não deveria acontecer se a verificação de existência passou, mas é uma segurança
//         return new NextResponse(
//             JSON.stringify({ message: 'Produto não encontrado para atualização.' }),
//             { status: 404, headers: { 'Content-Type': 'application/json' } }
//           );
//     }

//     // 4. Buscar o produto atualizado para retornar (opcional, mas bom para feedback)
//     const [updatedProduct] = await query({
//         query: "SELECT * FROM products WHERE id = ?",
//         values: [productId],
//       });

//     return NextResponse.json({ message: 'Produto atualizado com sucesso', product: updatedProduct });

//   } catch (error) {
//     console.error("Erro ao atualizar produto (admin):", error);
//     return new NextResponse(
//         JSON.stringify({ message: 'Erro interno do servidor ao atualizar produto.' }),
//         { status: 500, headers: { 'Content-Type': 'application/json' } }
//     );
//   }
// }

