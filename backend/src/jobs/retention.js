import { query } from '../db/pool.js';
import { logger } from '../config/logger.js';

/**
 * Retenção de dados (LGPD art. 15 e 16): nada fica guardado além do necessário.
 *
 * - Cadastros que nunca confirmaram o e-mail são apagados após UNVERIFIED_DAYS.
 *   (Não chegaram a usar o app: não têm agenda, personagens nem arquivos.)
 * - Códigos de confirmação/recuperação vencidos são apagados.
 *
 * Roda ao iniciar a API e a cada 12 h. No Render grátis a API "dorme" sem uso,
 * então na prática roda a cada vez que ela acorda — suficiente para estes prazos.
 */
export const UNVERIFIED_DAYS = 7;
const INTERVAL_MS = 12 * 60 * 60 * 1000;

export async function runRetention() {
  const unverified = await query(
    `DELETE FROM users
      WHERE email_verified_at IS NULL
        AND created_at < UTC_TIMESTAMP(3) - INTERVAL ${UNVERIFIED_DAYS} DAY`,
  );
  const codes = await query('DELETE FROM email_verifications WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 1 DAY');
  const resets = await query('DELETE FROM password_resets WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 1 DAY');
  const removed = unverified.rowCount + codes.rowCount + resets.rowCount;
  if (removed) {
    logger.info(
      { unverifiedAccounts: unverified.rowCount, expiredCodes: codes.rowCount + resets.rowCount },
      'retenção: dados vencidos removidos',
    );
  }
}

export function scheduleRetention() {
  const run = () => runRetention().catch((err) => logger.error({ err }, 'retenção: falha'));
  run();
  setInterval(run, INTERVAL_MS).unref();
}
