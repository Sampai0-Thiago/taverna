import { query } from '../../db/pool.js';

/** Código de recuperação de senha pendente (um por usuário). */
export const passwordResetRepository = {
  async find(userId) {
    const { rows } = await query(
      'SELECT user_id, code_hash, expires_at, attempts, last_sent_at FROM password_resets WHERE user_id = ?',
      [userId],
    );
    return rows[0] ?? null;
  },

  /** Grava (ou substitui) o código pendente e zera as tentativas. */
  async upsert(userId, { codeHash, expiresAt, sentAt }) {
    await query(
      `INSERT INTO password_resets (user_id, code_hash, expires_at, attempts, last_sent_at)
       VALUES (?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at),
                               attempts = 0, last_sent_at = VALUES(last_sent_at)`,
      [userId, codeHash, expiresAt, sentAt],
    );
  },

  async incrementAttempts(userId) {
    await query('UPDATE password_resets SET attempts = attempts + 1 WHERE user_id = ?', [userId]);
  },

  async remove(userId) {
    await query('DELETE FROM password_resets WHERE user_id = ?', [userId]);
  },
};
