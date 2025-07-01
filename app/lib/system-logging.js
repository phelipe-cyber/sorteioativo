// app/lib/system-logging.js
import { dbPool } from './db'; // Importa o pool de conexões do seu ficheiro de DB

/**
 * Grava um log no banco de dados.
 * @param {object | null} connection - Uma conexão de banco de dados existente, se dentro de uma transação. Se for null, uma nova será obtida do pool.
 * @param {string} level - O nível do log (ex: 'INFO', 'ERROR', 'WARN').
 * @param {string} context - O contexto onde o log foi gerado (ex: 'webhook', 'cron-job').
 * @param {string} message - A mensagem de log.
 * @param {object | null} payload - Dados adicionais em formato de objeto a serem guardados como JSON.
 * @param {number | null} userId - O ID do utilizador associado ao log.
 * @param {number | null} orderId - O ID do pedido associado ao log.
 */
export const logToDatabase = async (connection, level, context, message, payload = null, userId = null, orderId = null) => {
  // Usa a conexão fornecida se estiver numa transação, senão, obtém uma do pool.
  const conn = connection || dbPool;
  try {
    const query = "INSERT INTO system_logs (level, context, message, payload, user_id, order_id) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [level, context, message, payload ? JSON.stringify(payload) : null, userId, orderId];
    await conn.execute(query, values);
  } catch (dbError) {
    console.error("FALHA CRÍTICA AO LOGAR NO BANCO DE DADOS:", dbError);
    // Log do erro original para o console, caso a escrita no banco de dados falhe.
    console.error("Log Original que Falhou:", { level, context, message, payload, userId, orderId });
  }
};
