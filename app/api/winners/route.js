// app/api/winners/route.js
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/winners:
 *   get:
 *     summary: Lista os ganhadores dos sorteios finalizados
 *     description: Retorna uma lista de produtos com status 'drawn', incluindo o nome do produto, o número vencedor e o nome do ganhador.
 *     tags:
 *       - Public
 *     responses:
 *       '200':
 *         description: Uma lista de sorteios finalizados e seus ganhadores.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 winners:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: integer
 *                       product_name:
 *                         type: string
 *                       product_image_url:
 *                         type: string
 *                       winning_number:
 *                         type: integer
 *                       winner_name:
 *                         type: string
 *             example:
 *               winners:
 *                 - product_id: 101
 *                   product_name: "iPhone 14 Pro Max"
 *                   product_image_url: "https://example.com/images/iphone14.jpg"
 *                   winning_number: 42
 *                   winner_name: "João Silva"
 *                 - product_id: 102
 *                   product_name: "PlayStation 5"
 *                   product_image_url: "https://example.com/images/ps5.jpg"
 *                   winning_number: 7
 *                   winner_name: "Maria Oliveira"
 *       '500':
 *         description: Erro interno do servidor.
 */


export async function GET() { // Removido 'request' que não era usado
  console.log("API /api/winners: Buscando lista de ganhadores...");
  try {
    const winners = await query({
      // Usamos um JOIN para pegar o nome do ganhador da tabela 'users'
      // A query ordena por p.updated_at, que precisa existir na tabela products
      query: `
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.image_url as product_image_url,
          p.winning_number,
          u.name as winner_name
        FROM products p
        JOIN users u ON p.winner_user_id = u.id
        WHERE p.status = 'drawn' AND p.winner_user_id IS NOT NULL AND p.winning_number IS NOT NULL
        ORDER BY p.updated_at DESC 
        LIMIT 10 
      `, // Limita aos 10 últimos ganhadores, por exemplo
      values: [],
    });

    console.log(`API /api/winners: ${winners.length} ganhadores encontrados.`);
    return NextResponse.json({ winners });

  } catch (error) {
    console.error("Erro ao listar ganhadores:", error);
    // Retorna uma resposta de erro em JSON para que o frontend possa ler a mensagem
    return new NextResponse(
        JSON.stringify({ message: 'Erro interno do servidor ao listar ganhadores.', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
