// lib/mailer.js
import nodemailer from 'nodemailer';

// Configura o "transportador" de e-mail usando as variáveis de ambiente
// Para desenvolvimento, você pode usar um serviço como Ethereal (cria contas de teste)
// ou configurar o Gmail com uma "Senha de App".
// Para produção, use um serviço de e-mail transacional dedicado (SendGrid, Mailgun, AWS SES).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true para porta 465, false para outras
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envia um e-mail de notificação para o ganhador do sorteio.
 * @param {object} options - As opções do e-mail.
 * @param {string} options.winnerEmail - O e-mail do ganhador.
 * @param {string} options.winnerName - O nome do ganhador.
 * @param {string} options.productName - O nome do produto sorteado.
 * @param {number} options.winningNumber - O número sorteado.
 */
export const sendWinnerNotificationEmail = async ({ winnerEmail, winnerName, productName, winningNumber }) => {
  const mailOptions = {
    from: `"Site de Sorteios" <${process.env.SMTP_USER}>`, // Remetente
    to: winnerEmail, // Destinatário
    subject: `🎉 Parabéns! Você é o ganhador do sorteio!`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h1 style="color: #4F46E5;">Olá, ${winnerName}!</h1>
        <p>Temos ótimas notícias!</p>
        <p>Você é o grande ganhador do sorteio do produto: <strong>${productName}</strong>.</p>
        <p>Seu número da sorte foi o: <strong style="font-size: 1.2em; color: #16A34A;">${String(winningNumber).padStart(2, '0')}</strong>.</p>
        <p>Entraremos em contato em breve através deste e-mail ou do seu telefone cadastrado para combinar os detalhes da entrega do seu prêmio ou o pagamento via PIX, conforme sua escolha.</p>
        <br>
        <p>Obrigado por participar!</p>
        <p><strong>Equipe do Site de Sorteios</strong></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail de notificação enviado para ${winnerEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Erro ao enviar e-mail de notificação para ${winnerEmail}:`, error);
    // Em produção, você pode querer adicionar um sistema de retry ou logar isso em um serviço de monitoramento.
    throw new Error('Falha ao enviar o e-mail de notificação.');
  }
};
