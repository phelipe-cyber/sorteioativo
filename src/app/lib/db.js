// lib/db.js
import mysql from 'mysql2/promise';

// Cria um pool de conexões em vez de uma conexão única
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// A função antiga, para consultas simples
export async function query({ query, values = [] }) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(query, values);
    return results;
  } catch (error) {
    throw new Error(error.message);
  } finally {
    if (connection) connection.release(); // Libera a conexão de volta para o pool
  }
}

// Exporta o pool para que possamos usá-lo diretamente para transações
export const dbPool = pool;