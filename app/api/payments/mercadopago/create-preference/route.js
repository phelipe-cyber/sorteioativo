// app/api/payments/mercadopago/create-preference/route.js
import { NextResponse } from 'next/server';
import mpClient from '@/app/lib/mercadopago';
import { Preference } from 'mercadopago';
import { dbPool } from '@/app/lib/db';
import { verifyAuth } from '@/app/lib/authMiddleware';

export async function POST(request) {
  console.log('API create-preference: Iniciando criação de preferência (lógica de indisponibilidade ajustada)...');
  const authResult = await verifyAuth(request);
  if (!authResult.isAuthenticated) {
    return authResult.error;
  }
  const userId = authResult.payload.id; // ID do usuário logado

  let connection;
  try {
    const { orderId: existingOrderId, productId, selectedNumbers, totalAmount } = await request.json();

    console.log('API create-preference: Dados recebidos:', { existingOrderId, productId, selectedNumbers, totalAmount, userId });

    if (!productId || !selectedNumbers || !Array.isArray(selectedNumbers) || selectedNumbers.length === 0 || !totalAmount) {
      console.error('API create-preference: Dados do pedido incompletos ou inválidos.');
      return new NextResponse(JSON.stringify({ message: 'Dados do pedido incompletos ou inválidos.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const [productDetailsArr] = await dbPool.execute(
      "SELECT name, description, price_per_number FROM products WHERE id = ?",
      [productId]
    );

    if (productDetailsArr.length === 0) {
      console.error(`API create-preference: Produto ID ${productId} não encontrado.`);
      return new NextResponse(JSON.stringify({ message: 'Produto não encontrado.' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const productDetails = productDetailsArr[0];

    // const expectedTotal = parseFloat(productDetails.price_per_number) * selectedNumbers.length;
    // if (Math.abs(parseFloat(totalAmount) - expectedTotal) > 0.01) {
    //   console.error(`API create-preference: TotalAmount ${totalAmount} não confere com o esperado ${expectedTotal}.`);
    //   return new NextResponse(JSON.stringify({ message: 'Valor total do pedido inválido.' }), {
    //     status: 400, headers: { 'Content-Type': 'application/json' },
    //   });
    // }

    connection = await dbPool.getConnection();
    console.log('API create-preference: Conexão com DB obtida.');
    await connection.beginTransaction();
    console.log('API create-preference: Transação iniciada.');

    let internalOrderId = existingOrderId; // Usará o ID existente se válido, ou um novo será criado

    if (existingOrderId) {
      console.log(`API create-preference: Tentando reutilizar pedido ID ${existingOrderId}`);
      // const [existingOrderRows] = await connection.execute(
      //   "SELECT id, status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE", // FOR UPDATE para travar a linha
      //   [existingOrderId, userId]
      // );

      // if (existingOrderRows.length > 0 && existingOrderRows[0].status === 'pending') {
      //   console.log(`API create-preference: Pedido ${existingOrderId} encontrado e pendente. Reutilizando.`);
      //   // Liberar números anteriormente reservados para este pedido, pois a seleção pode ter mudado
      //   const [releaseResult] = await connection.execute(
      //     "UPDATE raffle_numbers SET status = 'available', user_id = NULL, order_id = NULL, reserved_at = NULL WHERE order_id = ? AND user_id = ? AND status = 'reserved'",
      //     [existingOrderId, userId]
      //   );
      //   console.log(`API create-preference: ${releaseResult.affectedRows} números anteriormente reservados para o pedido ${existingOrderId} foram liberados.`);

      //   // Atualizar o pedido existente (ex: total, detalhes de pagamento)
      //   await connection.execute(
      //     "UPDATE orders SET total_amount = ?, payment_details = 'Mercado Pago Iniciado (Retentativa)' WHERE id = ?",
      //     [totalAmount, existingOrderId]
      //   );
      //   console.log(`API create-preference: Pedido ${existingOrderId} atualizado (total, payment_details).`);
      // } else {
      //   console.log(`API create-preference: Pedido ${existingOrderId} não encontrado, não pertence ao usuário ou não está pendente. Criando um novo pedido.`);
      //   internalOrderId = null; // Força a criação de um novo pedido
      // }
    }

    // --- LÓGICA DE SALVAR OS NÚMEROS COMO JSON ---
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
    // Seleciona também o user_id para a verificação de reserva
    const [numberRows] = await connection.execute(
      `SELECT number_value, status, user_id FROM raffle_numbers WHERE product_id = ? AND number_value IN (${placeholders}) FOR UPDATE`,
      [productId, ...selectedNumbers]
    );

    if (numberRows.length !== selectedNumbers.length) {
      await connection.rollback();
      console.error('API create-preference: Um ou mais números selecionados não existem para este produto.');
      return new NextResponse(JSON.stringify({ message: 'Um ou mais números selecionados são inválidos para este produto.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // --- LÓGICA DE INDISPONIBILIDADE AJUSTADA ---
    const unavailableNumbersDetails = numberRows.filter(num => {
      if (num.status === 'sold') return true; // Indisponível se vendido
      if (num.status === 'reserved' && num.user_id !== userId) return true; // Indisponível se reservado por OUTRO usuário
      return false; // Disponível se 'available' ou reservado PELO PRÓPRIO usuário
    });
    // --- FIM DA LÓGICA AJUSTADA ---

    if (unavailableNumbersDetails.length > 0) {
      await connection.rollback();
      const unavailableParsedNumbers = unavailableNumbersDetails.map(n => n.number_value);
      console.error('API create-preference: (Após ajuste de pedido) Números indisponíveis para este usuário:', unavailableParsedNumbers);
      return new NextResponse(
        JSON.stringify({
          message: `Os seguintes números não estão mais disponíveis para você: ${unavailableParsedNumbers.join(', ')}.`,
          unavailable_numbers: unavailableParsedNumbers
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // MARCAR OS NOVOS selectedNumbers COMO 'reserved'
    const [reserveResult] = await connection.execute(
      `UPDATE raffle_numbers SET status = 'reserved', user_id = ?, order_id = ?, reserved_at = NOW() WHERE product_id = ? AND number_value IN (${placeholders}) AND status = 'available'`,
      [userId, internalOrderId, productId, ...selectedNumbers]
    );

    // Esta verificação é importante: se affectedRows for menor que selectedNumbers.length,
    // significa que alguns números que o usuário selecionou (e que passaram na verificação de 'unavailableNumbersDetails' acima)
    // não estavam 'available' no momento exato deste UPDATE. Isso pode acontecer se um número estava 'reserved'
    // pelo próprio usuário para ESTE MESMO internalOrderId (se reutilizando um pedido) e a lógica de liberação anterior não o tornou 'available' a tempo.
    // Ou, em um cenário de alta concorrência, outro processo reservou entre o SELECT FOR UPDATE e este UPDATE (menos provável com FOR UPDATE).
    if (reserveResult.affectedRows !== selectedNumbers.filter(sn => numberRows.find(nr => nr.number_value === sn && nr.status === 'available')).length) {
      // Contamos quantos dos selectedNumbers estavam de fato 'available' segundo o 'numberRows'
      const availableForReservationCount = selectedNumbers.filter(sn =>
        numberRows.find(nr => nr.number_value === sn && nr.status === 'available')
      ).length;

      if (reserveResult.affectedRows !== availableForReservationCount && availableForReservationCount > 0) {
        await connection.rollback();
        console.error(`API create-preference: Falha ao reservar todos os números que estavam disponíveis. Esperado: ${availableForReservationCount}, Reservado: ${reserveResult.affectedRows}`);
        return new NextResponse(JSON.stringify({ message: 'Erro crítico ao tentar reservar os números disponíveis. Tente novamente.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      } else if (availableForReservationCount === 0 && selectedNumbers.length > 0) {
        // Todos os números selecionados já estavam reservados (possivelmente pelo próprio usuário para este pedido)
        console.log(`API create-preference: Nenhum número 'available' para reservar, mas os selecionados já podem estar reservados para este pedido ${internalOrderId}.`);
      } else {
        console.log(`API create-preference: ${reserveResult.affectedRows} números que estavam 'available' foram marcados como 'reserved' para o pedido ${internalOrderId}.`);
      }
    } else {
      console.log(`API create-preference: ${reserveResult.affectedRows} números que estavam 'available' foram marcados como 'reserved' para o pedido ${internalOrderId}.`);
    }

    const preferenceClient = new Preference(mpClient);
    const preferenceBody = {
      items: [
        {
          id: `${productId}-${internalOrderId}`,
          title: `Sorteio: ${productDetails.name} (Pedido ${internalOrderId})`,
          description: `Números: ${selectedNumbers.join(', ')}`,
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
    console.log('API create-preference: Corpo da preferência a ser enviado ao MP:', JSON.stringify(preferenceBody, null, 2));

    const mpPreference = await preferenceClient.create({ body: preferenceBody });
    console.log(`API create-preference: Preferência MP criada: ID ${mpPreference.id}`);

    await connection.execute(
      "UPDATE orders SET payment_details = CONCAT_WS('\\n', payment_details, ?) WHERE id = ?",
      [`Mercado Pago Preference ID: ${mpPreference.id}`, internalOrderId]
    );
    await connection.commit();
    console.log('API create-preference: Transação commitada.');

    return NextResponse.json({
      preferenceId: mpPreference.id,
      init_point: mpPreference.init_point
    });

  } catch (error) {
    if (connection) {
      console.error('API create-preference: Erro detectado, realizando rollback...', error);
      await connection.rollback();
    }
    const errorMessage = error.cause?.message || error.data?.message || error.message || 'Erro desconhecido';
    console.error('API create-preference: Erro final ao criar preferência Mercado Pago:', error.cause || error.data || error);
    return new NextResponse(JSON.stringify({ message: 'Erro ao criar preferência de pagamento.', details: errorMessage }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (connection) {
      console.log('API create-preference: Liberando conexão com DB.');
      connection.release();
    }
  }
}
