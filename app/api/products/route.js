// app/api/products/route.js

import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lista todos os produtos ativos
 *     description: |
 *       Retorna uma lista de todos os produtos que estão atualmente ativos e disponíveis para compra.
 *     tags:
 *       - Products
 *     responses:
 *       '200':
 *         description: Lista de produtos ativos.
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
 *       '500':
 *         description: Erro interno do servidor.
 */


export async function GET() {
  try {
    const products = await query({
      // --- CORREÇÃO AQUI: Adicionado 'prize_type' à consulta SQL ---
      query: "SELECT * FROM products WHERE status = 'active'",
      values: [],
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Erro ao listar produtos (API /api/products):", error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao listar produtos.'}), { 
        status: 500,
        headers: { 'Content-Type': 'application/json'}
    });
  }
}
