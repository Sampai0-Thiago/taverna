import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

/**
 * Executor de migrações simples e idempotente.
 * Cada arquivo .sql em ./migrations é aplicado uma única vez, em ordem alfabética,
 * dentro de uma transação, e registrado na tabela schema_migrations.
 */
const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function runMigrations({ log = console.log } = {}) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      log(`→ aplicando ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Falha na migração ${file}: ${error.message}`, { cause: error });
      }
    }
    log('✓ migrações em dia');
  } finally {
    client.release();
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
