// app/api/admin/products/[id]/draw/route.js

import { NextResponse } from 'next/server';
import { dbPool } from '@/app/lib/db'; // Ajuste o caminho se necessário
import { verifyAdminAuth } from '@/app/lib/adminAuthMiddleware'; // Ajuste o caminho se necessário
import { sendWinnerNotificationEmail } from '@/app/lib/mailer'; // Importar a nova função de e-mail

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

export async function POST(request, { params }) {
  // 1. Verificar se o usuário é um admin
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }

  const productId = params.id;
  let connection;

  console.log(`API Admin Draw: Iniciando sorteio para produto ID: ${productId}`);

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();
    console.log(`API Admin Draw: Transação iniciada para produto ID: ${productId}`);

    // 2. Verificar se o produto existe e está 'ativo'
    const [productRows] = await connection.execute(
      "SELECT status, name, total_numbers FROM products WHERE id = ? FOR UPDATE", // Pega também o nome e o total de números
      [productId]
    );

    if (productRows.length === 0) {
      await connection.rollback();
      return new NextResponse(JSON.stringify({ message: 'Produto não encontrado' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const product = productRows[0];
    if (product.status !== 'active') {
      await connection.rollback();
      return new NextResponse(JSON.stringify({ message: `O sorteio não pode ser realizado. Status atual do produto: ${product.status}` }), 
        { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Verificar se todos os números foram vendidos
    const [countRows] = await connection.execute(
        "SELECT COUNT(*) as sold_count FROM raffle_numbers WHERE product_id = ? AND status = 'sold'",
        [productId]
    );
    
    const totalNumbersExpected = (product.total_numbers || 0) + 1; // +1 porque os números vão de 0 a total_numbers

    const soldCount = countRows[0].sold_count;
    if (soldCount < totalNumbersExpected) { 
        await connection.rollback();
        return new NextResponse(JSON.stringify({ message: `O sorteio não pode ser realizado. Apenas ${soldCount} de ${totalNumbersExpected} números foram vendidos.` }), 
            { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 4. Buscar todos os números vendidos e escolher o vencedor
    const [soldNumbers] = await connection.execute(
      "SELECT number_value, user_id, order_id FROM raffle_numbers WHERE product_id = ? AND status = 'sold'",
      [productId]
    );
    const winner = soldNumbers[Math.floor(Math.random() * soldNumbers.length)];
    console.log(`API Admin Draw: Vencedor sorteado para produto ID ${productId}: Número ${winner.number_value} (Utilizador ID: ${winner.user_id}, Pedido ID: ${winner.order_id})`);

    // 5. Buscar os dados do ganhador para a notificação
    const [winnerDetailsRows] = await connection.execute(
        "SELECT name, email FROM users WHERE id = ?",
        [winner.user_id]
    );
    if (winnerDetailsRows.length === 0) {
        await connection.rollback();
        console.error(`API Admin Draw: Ganhador com ID ${winner.user_id} não foi encontrado.`);
        return new NextResponse(JSON.stringify({ message: 'Erro: Ganhador não encontrado no sistema.' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    const winnerDetails = winnerDetailsRows[0];

    // 6. Atualizar o produto com o resultado
    await connection.execute(
      "UPDATE products SET status = 'drawn', winning_number = ?, winner_user_id = ? WHERE id = ?",
      [winner.number_value, winner.user_id, productId]
    );
    
    // 7. Inserir a notificação para o ganhador na tabela 'notifications'
    const notificationMessage = `Parabéns! Você ganhou o sorteio do produto "${product.name}" com o número ${String(winner.number_value).padStart(2,'0')}.`;
    await connection.execute(
        "INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)",
        [winner.user_id, notificationMessage, `/my-numbers`] 
    );
    console.log(`API Admin Draw: Notificação criada no banco para o utilizador ID ${winner.user_id}.`);
    
    await connection.commit();
    console.log(`API Admin Draw: Transação commitada para produto ID: ${productId}`);

     // --- ALTERAÇÃO AQUI: Passar o order_id para a função de e-mail ---
    // 8. Enviar o e-mail de notificação (após a transação ser confirmada)
    try {
      await sendWinnerNotificationEmail({
          winnerEmail: winnerDetails.email,
          winnerName: winnerDetails.name,
          productName: product.name,
          winningNumber: winner.number_value,
          orderId: winner.order_id // Passando o ID do pedido
      });
  } catch (emailError) {
      console.error(`API Admin Draw: O sorteio foi um sucesso, mas o envio de e-mail para ${winnerDetails.email} falhou:`, emailError);
  }

  return NextResponse.json({
    message: 'Sorteio realizado! O ganhador foi notificado por e-mail e na plataforma.',
    winningNumber: winner.number_value,
    winningUserId: winner.user_id,
    winnerName: winnerDetails.name,
    orderId: winner.order_id
  }, { status: 200 });

} catch (error) {
  if (connection) await connection.rollback();
  console.error(`API Admin Draw: Erro CRÍTICO ao realizar sorteio para produto ID ${productId}:`, error);
  return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor ao realizar sorteio' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
  });
} finally {
  if (connection) connection.release();
}
}
