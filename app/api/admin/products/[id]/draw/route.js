// app/api/admin/products/[id]/draw/route.js

import { NextResponse } from 'next/server';
import { dbPool } from '../../../../../lib/db'; // Ajuste o caminho se necessário
import { verifyAdminAuth } from '../../../../../lib/adminAuthMiddleware'; // Ajuste o caminho se necessário

/**
 * @swagger
 * /api/admin/products/{id}/draw:
 *   post:
 *     summary: Realiza o sorteio de um produto
 *     description: (Admin) Sorteia um número vencedor entre todos os números vendidos de um produto. Só funciona se o produto estiver 'ativo' e se todos os 101 números tiverem sido vendidos.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: O ID do produto a ser sorteado.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Sorteio realizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sorteio realizado com sucesso!"
 *                 winningNumber:
 *                   type: integer
 *                 winningUserId:
 *                   type: integer
 *       '401':
 *         description: Não autenticado.
 *       '403':
 *         description: Acesso negado, não é um administrador.
 *       '404':
 *         description: Produto não encontrado.
 *       '409':
 *         description: Conflito. O sorteio não pode ser realizado (produto não está ativo ou nem todos os números foram vendidos).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '500':
 *         description: Erro interno do servidor.
 */

export async function POST(request, { params }) { // <<< 'params' é desestruturado aqui
  // 1. Verificar se o usuário é um admin
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const productId = params.id; // <<< Acessa params.id diretamente
  let connection;

  console.log(`API Admin Draw: Iniciando sorteio para produto ID: ${productId}`);

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();
    console.log(`API Admin Draw: Transação iniciada para produto ID: ${productId}`);

    // 2. Verificar se o produto existe e está 'ativo'
    const [productRows] = await connection.execute(
      "SELECT status FROM products WHERE id = ? FOR UPDATE", // FOR UPDATE para travar a linha
      [productId]
    );

    if (productRows.length === 0) {
      await connection.rollback();
      console.error(`API Admin Draw: Produto ID ${productId} não encontrado.`);
      return new NextResponse(JSON.stringify({ message: 'Produto não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const productStatus = productRows[0].status;
    if (productStatus !== 'active') {
      await connection.rollback();
      console.warn(`API Admin Draw: Tentativa de sortear produto ID ${productId} com status '${productStatus}'.`);
      return new NextResponse(JSON.stringify({ message: `O sorteio não pode ser realizado. Status atual do produto: ${productStatus}` }), {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Verificar se TODOS os números (0-100, total 101) foram vendidos para este produto
    const [countRows] = await connection.execute(
        "SELECT COUNT(*) as sold_count FROM raffle_numbers WHERE product_id = ? AND status = 'sold'",
        [productId]
    );

    const soldCount = countRows[0].sold_count;
    const totalNumbersExpected = 101; // Números de 0 a 100

    if (soldCount < totalNumbersExpected) { 
        await connection.rollback();
        console.warn(`API Admin Draw: Sorteio para produto ID ${productId} não pode ser realizado. Apenas ${soldCount} de ${totalNumbersExpected} números foram vendidos.`);
        return new NextResponse(JSON.stringify({ message: `O sorteio não pode ser realizado. Apenas ${soldCount} de ${totalNumbersExpected} números foram vendidos.` }), {
            status: 409, // Conflict
            headers: { 'Content-Type': 'application/json' },
        });
    }
    console.log(`API Admin Draw: Produto ID ${productId} tem ${soldCount} números vendidos. Prosseguindo com o sorteio.`);

    // 4. Se tudo ok, buscar todos os números vendidos para o sorteio
    const [soldNumbers] = await connection.execute(
      "SELECT number_value, user_id FROM raffle_numbers WHERE product_id = ? AND status = 'sold'",
      [productId]
    );

    if (soldNumbers.length === 0) { // Checagem extra, embora a contagem anterior já devesse cobrir
        await connection.rollback();
        console.error(`API Admin Draw: Nenhum número vendido encontrado para produto ID ${productId} apesar da contagem.`);
        return new NextResponse(JSON.stringify({ message: 'Nenhum número vendido encontrado para realizar o sorteio.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }

    // 5. Escolher o vencedor aleatoriamente no lado do servidor
    const winner = soldNumbers[Math.floor(Math.random() * soldNumbers.length)];
    console.log(`API Admin Draw: Número vencedor sorteado para produto ID ${productId}: ${winner.number_value} (Usuário ID: ${winner.user_id})`);

    // 6. Atualizar o produto com o resultado do sorteio e mudar o status para 'drawn'
    await connection.execute(
      "UPDATE products SET status = 'drawn', winning_number = ?, winner_user_id = ? WHERE id = ?",
      [winner.number_value, winner.user_id, productId]
    );
    console.log(`API Admin Draw: Produto ID ${productId} atualizado para 'drawn' com o vencedor.`);
    
    // 7. Se tudo deu certo, confirmar a transação
    await connection.commit();
    console.log(`API Admin Draw: Transação commitada para produto ID: ${productId}`);

    return NextResponse.json({
      message: 'Sorteio realizado com sucesso!',
      winningNumber: winner.number_value,
      winningUserId: winner.user_id,
    }, { status: 200 });

  } catch (error) {
    if (connection) {
        console.error(`API Admin Draw: Erro na transação para produto ID ${productId}, realizando rollback...`, error);
        await connection.rollback();
    }
    console.error(`API Admin Draw: Erro CRÍTICO ao realizar sorteio para produto ID ${productId}:`, error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao realizar sorteio' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (connection) {
        console.log(`API Admin Draw: Liberando conexão para produto ID: ${productId}`);
        connection.release();
    }
  }
}
