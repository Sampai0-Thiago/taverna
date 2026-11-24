import { query, withTransaction } from '../../db/pool.js';

export const availabilityRepository = {
  async listInRange(from, to) {
    const { rows } = await query(
      `SELECT user_id, date, status, note
         FROM availabilities
        WHERE date BETWEEN $1 AND $2
        ORDER BY date`,
      [from, to],
    );
    return rows;
  },

  /** Grava várias marcações do usuário de forma atômica. status = null remove a marcação. */
  async bulkUpsert(userId, entries) {
    return withTransaction(async (client) => {
      for (const { date, status, note } of entries) {
        if (status === null) {
          await client.query('DELETE FROM availabilities WHERE user_id = $1 AND date = $2', [userId, date]);
        } else {
          await client.query(
            `INSERT INTO availabilities (user_id, date, status, note)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, date)
             DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
            [userId, date, status, note ?? null],
          );
        }
      }
    });
  },
};
