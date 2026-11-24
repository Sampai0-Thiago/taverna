import pg from 'pg';
import { env } from '../config/env.js';

const { Pool, types } = pg;

// Colunas DATE (OID 1082) chegam como string 'YYYY-MM-DD' — evita deslocamento de fuso horário.
types.setTypeParser(1082, (value) => value);

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

/** Executa uma query parametrizada (nunca concatene valores em SQL). */
export function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Executa `work(client)` dentro de uma transação.
 * Faz COMMIT em caso de sucesso e ROLLBACK em qualquer erro.
 */
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
