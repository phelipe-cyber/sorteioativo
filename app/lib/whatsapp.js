// lib/whatsapp.js

// const SUPPORT_PHONE_NUMBER = "5511964081280";

/**
 * Gera uma URL "Click-to-Chat" do WhatsApp.
 * @param {string} phone - O número de telefone do destinatário no formato internacional (ex: 5511999999999).
 * @param {string} message - A mensagem a ser pré-preenchida.
 * @returns {string} A URL completa do WhatsApp.
 */
  
  /**
   * Gera a mensagem de notificação de pagamento aprovado.
   */
  export const createSuccessNotification = (userName, productName, orderId, purchasedNumbers, paymentLink) => {
    const message = `Olá, ${userName}! ✅\n\nO seu pagamento para o sorteio *${productName}* (Pedido #${orderId}) foi aprovado!\n\nOs seus números da sorte são: *${purchasedNumbers.join(', ')}*.\n\nBoa sorte! 🍀`;
    return { message, link: paymentLink };
    // return { message, link: generateWhatsAppLink(SUPPORT_PHONE_NUMBER, `Gostaria de falar sobre o meu pedido #${orderId}.`) };
  };
  
  /**
   * Gera a mensagem de lembrete de pagamento pendente.
   */
  export const createReminderNotification = (userName, productName, orderId, reservedNumbers, paymentLink) => {
    const message = `Olá, ${userName}! ⏳\n\nEste é um lembrete de que o seu pagamento para o sorteio *${productName}* (Pedido #${orderId}) está pendente.\n\nOs seus números *${reservedNumbers.join(', ')}* estão reservados. Para não os perder, finalize o pagamento aqui: ${paymentLink}`;
    return { message, link: paymentLink };
  };
  
  /**
   * Gera a mensagem de notificação para o ganhador.
   */
  export const createWinnerNotification = (userName, productName, orderId, winningNumber) => {
    const message = `🎉 PARABÉNS, ${userName}! 🎉\n\nVocê é o grande ganhador(a) do sorteio *${productName}* (do seu Pedido #${orderId})!\n\nO seu número da sorte foi o *${String(winningNumber).padStart(2, '0')}*.\n\nEm breve entraremos em contato para combinar a entrega do seu prêmio! 🥳`;
    return { message };
    };
  
  /**
   * --- NOVA FUNÇÃO ---
   * Gera a mensagem de notificação de pagamento que falhou.
   */
  export const createFailureNotification = (userName, productName, orderId, paymentRetryLink) => {
      const message = `Olá, ${userName}. 😕\n\nO seu pagamento para o sorteio *${productName}* (Pedido #${orderId}) não pôde ser processado.\n\nOs seus números foram libertados. Se desejar, pode tentar novamente selecionando os números e fazendo um novo pagamento.\n\nClique aqui para tentar novamente: ${paymentRetryLink}`;
      return { message, link: paymentRetryLink };
  };
  
/**
 * --- NOVA FUNÇÃO ---
 * Gera a mensagem de notificação de pedido cancelado por inatividade.
 * @param {string} userName - O nome do utilizador.
 * @param {string} productName - O nome do produto.
 * @param {number} orderId - O ID do pedido.
 */
export const createCancellationNotification = (userName, productName, orderId) => {
  const message = `Olá, ${userName}. ℹ️\n\nO seu pedido #${orderId} para o sorteio *${productName}* foi cancelado por falta de pagamento.\n\nOs números que estavam reservados foram libertados e já estão disponíveis para outros participantes.\n\nSe ainda tiver interesse, pode aceder à página do sorteio e fazer uma nova seleção.`;
  const buttons = [{ body: 'Ver Sorteio' }];
  return { message, buttons };
};

  // --- FUNÇÃO ATUALIZADA COM MELHOR LOG DE ERRO E URL CORRETA ---
  export const sendWhatsAppNotification = async (phone, message) => {
      try {
        const apiUrl = `${process.env.APP_URL_WHAT}/send-message`;
        const bodyData = new URLSearchParams();
        bodyData.append('number', phone);
        bodyData.append('message', message);
    
        console.log(`Tentando enviar notificação via WhatsApp para ${phone} via ${apiUrl}`);
    
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyData.toString(),
        });
    
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`A API do WhatsApp respondeu com erro ${response.status}:`, errorText);
          throw new Error(`A API do WhatsApp respondeu com erro: ${response.statusText}`);
        }
    
        const result = await response.json();
        console.log("Resposta da API de WhatsApp:", result);
        return { success: true, message: "Notificação enviada com sucesso via API." };
    
      } catch (error) {
        console.error("Erro ao enviar notificação via API do WhatsApp:", error.message);
        if (error.cause) {
            console.error("Causa do erro (detalhes de rede):", error.cause);
        }
        
        return { success: false, message: "Falha ao enviar notificação via WhatsApp. Verifique a conectividade do servidor." };
      }
    };
    