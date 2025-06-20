// app/api/payments/mercadopago/create-preference/route.js
import { NextResponse } from 'next/server';
import mpClient from '@/app/lib/mercadopago';
import { Preference } from 'mercadopago';
import { dbPool } from '@/app/lib/db';
import { verifyAuth } from '@/app/lib/authMiddleware';

export async function POST(request) {
  console.log('API create-preference: Iniciando criação de preferência (com lógica de reutilização de pedido)...');
  const authResult = await verifyAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const userId = authResult.payload.id;

  let connection;
  try {
    // Adicionado orderId opcional
    const { orderId: existingOrderId, productId, selectedNumbers, totalAmount, prizeChoice } = await request.json();

    console.log('API create-preference: Dados recebidos:', { existingOrderId, productId, selectedNumbers, totalAmount, prizeChoice, userId });

    if (!productId || !selectedNumbers || !Array.isArray(selectedNumbers) || selectedNumbers.length === 0 || !totalAmount) {
      console.error('API create-preference: Dados do pedido incompletos ou inválidos.');
      return new NextResponse(JSON.stringify({ message: 'Dados do pedido incompletos ou inválidos.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const [productDetailsArr] = await dbPool.execute(
      "SELECT name, description, price_per_number, prize_type FROM products WHERE id = ?",
      [productId]
    );

    if (productDetailsArr.length === 0) {
      console.error(`API create-preference: Produto ID ${productId} não encontrado.`);
      return new NextResponse(JSON.stringify({ message: 'Produto não encontrado.' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const productDetails = productDetailsArr[0];

    // Validação da escolha do prêmio
    if (productDetails.prize_type === 'product_or_pix' && !['pix', 'product'].includes(prizeChoice)) {
        return new NextResponse(JSON.stringify({ message: 'A escolha entre PIX ou Produto é obrigatória para este sorteio.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }
    const finalPrizeChoice = productDetails.prize_type === 'product_only' ? 'product' : prizeChoice;


    const expectedTotal = parseFloat(productDetails.price_per_number) * selectedNumbers.length;
    if (Math.abs(parseFloat(totalAmount) - expectedTotal) > 0.01) {
        console.error(`API create-preference: TotalAmount ${totalAmount} não confere com o esperado ${expectedTotal}.`);
        return new NextResponse(JSON.stringify({ message: 'Valor total do pedido inválido.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    connection = await dbPool.getConnection();
    console.log('API create-preference: Conexão com DB obtida.');
    await connection.beginTransaction();
    console.log('API create-preference: Transação iniciada.');

    let internalOrderId = existingOrderId;

    if (existingOrderId) {
      console.log(`API create-preference: Tentando reutilizar pedido ID ${existingOrderId}`);
      const [existingOrderRows] = await connection.execute(
        "SELECT id, status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE",
        [existingOrderId, userId]
      );

      if (existingOrderRows.length > 0 && existingOrderRows[0].status === 'pending') {
        console.log(`API create-preference: Pedido ${existingOrderId} encontrado e pendente. Reutilizando.`);
        
        const [releaseResult] = await connection.execute(
          "UPDATE raffle_numbers SET status = 'available', user_id = NULL, order_id = NULL, reserved_at = NULL WHERE order_id = ? AND user_id = ? AND status = 'reserved'",
          [existingOrderId, userId]
        );
        console.log(`API create-preference: ${releaseResult.affectedRows} números anteriormente reservados para o pedido ${existingOrderId} foram libertados.`);

        await connection.execute(
          "UPDATE orders SET total_amount = ?, prize_choice = ?, payment_details = 'Mercado Pago Iniciado (Retentativa)' WHERE id = ?",
          [totalAmount, finalPrizeChoice, existingOrderId]
        );
        console.log(`API create-preference: Pedido ${existingOrderId} atualizado.`);
      } else {
        console.log(`API create-preference: Pedido ${existingOrderId} não encontrado ou não está pendente. Criando um novo.`);
        internalOrderId = null; 
      }
    }

    if (!internalOrderId) {
      // Salvar os números selecionados como uma string JSON
      const selectedNumbersJson = JSON.stringify(selectedNumbers.sort((a, b) => a - b));

      const [orderResult] = await connection.execute(
        "INSERT INTO orders (user_id, product_id, total_amount, status, payment_details, pending_selected_numbers) VALUES (?, ?, ?, 'pending', 'Mercado Pago Iniciado', ?)",
        [userId, productId, totalAmount, selectedNumbersJson] // Adicionado selectedNumbersJson
      );
      internalOrderId = orderResult.insertId;
      console.log(`API create-preference: Novo pedido ${internalOrderId} criado com status 'pending' e números pendentes: ${selectedNumbersJson}.`);
    }

    const placeholders = selectedNumbers.map(() => '?').join(',');
    const [numberRows] = await connection.execute(
      `SELECT number_value, status, user_id as owner_id FROM raffle_numbers WHERE product_id = ? AND number_value IN (${placeholders}) FOR UPDATE`,
      [productId, ...selectedNumbers]
    );

    if (numberRows.length !== selectedNumbers.length) {
       await connection.rollback();
       return new NextResponse(JSON.stringify({ message: 'Um ou mais números selecionados são inválidos para este produto.' }), { status: 400 });
    }

    const unavailableNumbersDetails = numberRows.filter(num => {
      if (num.status === 'sold') return true;
      if (num.status === 'reserved' && num.owner_id !== userId) return true;
      return false;
    });

    if (unavailableNumbersDetails.length > 0) {
      await connection.rollback();
      const unavailableParsedNumbers = unavailableNumbersDetails.map(n => n.number_value);
      return new NextResponse(
        JSON.stringify({ 
          message: `Os seguintes números não estão mais disponíveis para você: ${unavailableParsedNumbers.join(', ')}.`,
          unavailable_numbers: unavailableParsedNumbers 
        }), 
        { status: 409 }
      );
    }

    const [reserveResult] = await connection.execute(
      `UPDATE raffle_numbers SET status = 'reserved', user_id = ?, order_id = ?, reserved_at = NOW() WHERE product_id = ? AND number_value IN (${placeholders}) AND status = 'available'`,
      [userId, internalOrderId, productId, ...selectedNumbers]
    );
    
    const availableForReservationCount = selectedNumbers.filter(sn => 
        numberRows.find(nr => nr.number_value === sn && nr.status === 'available')
    ).length;

    if (reserveResult.affectedRows !== availableForReservationCount && availableForReservationCount > 0) {
        await connection.rollback();
        return new NextResponse(JSON.stringify({ message: 'Erro crítico ao tentar reservar os números disponíveis. Tente novamente.' }), { status: 500 });
    }
    
    const preferenceClient = new Preference(mpClient);
    const preferenceBody = {
      items: [
        {
          id: `${productId}-${internalOrderId}`, 
          title: `Sorteio: ${productDetails.name} (Pedido #${internalOrderId})`,
          description: `Números: ${selectedNumbers.join(', ')} | Escolha: ${finalPrizeChoice}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(totalAmount),
        },
      ],
      payer: { email: authResult.payload.email },
      back_urls: {
        success: `${process.env.APP_URL_WEBHOOK}/payment/success?order_id=${internalOrderId}`,
        failure: `${process.env.APP_URL_WEBHOOK}/payment/failure?order_id=${internalOrderId}`,
        pending: `${process.env.APP_URL_WEBHOOK}/payment/pending?order_id=${internalOrderId}`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.APP_URL_WEBHOOK}/api/payments/mercadopago/webhook?source_news=webhooks`,
      external_reference: String(internalOrderId),
    };

    const mpPreference = await preferenceClient.create({ body: preferenceBody });
    
    await connection.execute(
        "UPDATE orders SET payment_details = CONCAT_WS('\\n', payment_details, ?) WHERE id = ?",
        [`Mercado Pago Preference ID: ${mpPreference.id}`, internalOrderId]
    );
    await connection.commit();

    return NextResponse.json({ 
        preferenceId: mpPreference.id, 
        init_point: mpPreference.init_point 
    });

  } catch (error) {
    if (connection) await connection.rollback();
    const errorMessage = error.cause?.message || error.data?.message || error.message || 'Erro desconhecido';
    console.error('API create-preference: Erro final:', error.cause || error.data || error);
    return new NextResponse(JSON.stringify({ message: 'Erro ao criar preferência de pagamento.', details: errorMessage }), {
      status: error.status || 500
    });
  } finally {
    if (connection) connection.release();
  }
}
