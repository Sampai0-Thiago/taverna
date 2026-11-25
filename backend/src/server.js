import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { runMigrations } from './db/migrate.js';
import { pool } from './db/pool.js';
import { fileStorage } from './storage/fileStorage.js';
import { mailer } from './mail/mailer.js';
import { scheduleRetention } from './jobs/retention.js';

async function bootstrap() {
  await fileStorage.init();
  await runMigrations({ log: (msg) => logger.info(msg) });
  await mailer.verify();
  scheduleRetention();

  const server = createApp().listen(env.port, () => {
    logger.info(`🎲 API Gremad em http://localhost:${env.port}`);
  });

  // Encerramento gracioso (Docker/K8s enviam SIGTERM)
  const shutdown = (signal) => {
    logger.info(`${signal} recebido, encerrando...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'falha ao iniciar');
  process.exit(1);
});
