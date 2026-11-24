import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

/**
 * Conexão com o TiDB (compatível com o protocolo MySQL).
 *
 * - Datas/horas trafegam em UTC (`timezone: 'Z'` + `time_zone` da sessão), como no PostgreSQL.
 * - Colunas DATE chegam como string 'YYYY-MM-DD' — evita deslocamento de fuso horário.
 * - TINYINT(1) (BOOLEAN) vira true/false.
 * - TiDB Cloud exige TLS: ver `env.database.ssl`.
 */
function typeCast(field, next) {
  if (field.type === 'TINY' && field.length === 1) {
    const value = field.string();
    return value === null ? null : value === '1';
  }
  return next();
}

export const pool = mysql.createPool({
  ...env.database,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 30_000,
  enableKeepAlive: true,
  timezone: 'Z',
  dateStrings: ['DATE'],
  typeCast,
  charset: 'utf8mb4',
});

pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

/** Normaliza o retorno do mysql2 para { rows, rowCount } (mesmo formato usado pelos repositórios). */
function normalize([result]) {
  if (Array.isArray(result)) return { rows: result, rowCount: result.length };
  return { rows: [], rowCount: result.affectedRows, insertId: result.insertId };
}

/** Executa uma query parametrizada com placeholders `?` (nunca concatene valores em SQL). */
export async function query(text, params = []) {
  return normalize(await pool.query(text, params));
}

/**
 * Executa `work(client)` dentro de uma transação.
 * Faz COMMIT em caso de sucesso e ROLLBACK em qualquer erro.
 */
export async function withTransaction(work) {
  const conn = await pool.getConnection();
  const client = { query: async (text, params = []) => normalize(await conn.query(text, params)) };
  try {
    await conn.beginTransaction();
    const result = await work(client);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
