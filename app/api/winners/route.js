// app/api/winners/route.js
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/winners:
 * get:
 * summary: Lista os ganhadores dos sorteios finalizados
 * description: Retorna uma lista de produtos com status 'drawn', incluindo o nome do produto, o número vencedor e o nome do ganhador.
 * tags:
 * - Public
 * responses:
 * '200':
 * description: Uma lista de sorteios finalizados e seus ganhadores.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * winners:
 * type: array
 * items:
 * type: object
 * properties:
 * product_id:
 * type: integer
 * product_name:
 * type: string
 * product_image_url:
 * type: string
 * winning_number:
 * type: integer
 * winner_name:
 * type: string
 * '500':
 * description: Erro interno do servidor.
 */
export async function GET() {
  console.log("API /api/winners: Buscando lista de ganhadores...");
  try {
    const winners = await query({
      // Usamos um JOIN para pegar o nome do ganhador da tabela 'users'
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
    return new NextResponse(
        JSON.stringify({ message: 'Erro interno do servidor ao listar ganhadores.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
