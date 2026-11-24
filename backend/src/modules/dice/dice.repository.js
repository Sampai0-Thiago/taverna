import { randomUUID } from 'node:crypto';
import { query } from '../../db/pool.js';

const SELECT = `
  SELECT r.*, u.name AS user_name, u.color AS user_color, u.avatar_file AS user_avatar
    FROM dice_rolls r JOIN users u ON u.id = r.user_id`;

export const diceRepository = {
  async insert({ userId, expression, mode, detail, total, context }) {
    const id = randomUUID();
    await query(
      `INSERT INTO dice_rolls (id, user_id, expression, mode, detail, total, context)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, expression, mode, JSON.stringify(detail), total, context ?? null],
    );
    return this.findById(id);
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE r.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async recent(limit, after) {
    const { rows } = after
      ? await query(`${SELECT} WHERE r.created_at > ? ORDER BY r.created_at DESC LIMIT ?`, [new Date(after), limit])
      : await query(`${SELECT} ORDER BY r.created_at DESC LIMIT ?`, [limit]);
    return rows;
  },
};
