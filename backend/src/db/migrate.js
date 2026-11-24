import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { pool } from './pool.js';

/**
 * Executor de migrações simples e idempotente.
 * Cada arquivo .sql em ./migrations é aplicado uma única vez, em ordem alfabética,
 * e registrado na tabela schema_migrations.
 *
 * Atenção: no TiDB/MySQL, DDL (CREATE/ALTER) faz commit implícito, então uma migração
 * não é atômica. Se uma falhar no meio, corrija e remova manualmente o que já foi criado.
 */
const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Divide o arquivo em comandos: remove comentários `--` e separa por `;` no fim da linha. */
export function splitStatements(sql) {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, '').trimEnd())
    .join('\n')
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cria o banco indicado em DATABASE_URL se ainda não existir (no TiDB Cloud o padrão é só `test`). */
async function ensureDatabase() {
  const { database, ...server } = env.database;
  const conn = await mysql.createConnection(server);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)} CHARACTER SET utf8mb4`);
  } catch (error) {
    // Usuário sem permissão de CREATE DATABASE: segue em frente — se o banco já existir, tudo funciona.
    if (!['ER_DBACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(error.code)) throw error;
  } finally {
    await conn.end();
  }
}

export async function runMigrations({ log = console.log } = {}) {
  await ensureDatabase();
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      )`);

    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      log(`→ aplicando ${file}`);
      try {
        for (const statement of splitStatements(sql)) await conn.query(statement);
        await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      } catch (error) {
        throw new Error(`Falha na migração ${file}: ${error.message}`, { cause: error });
      }
    }
    log('✓ migrações em dia');
  } finally {
    conn.release();
  }
}

// Execução direta: `npm run migrate`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
