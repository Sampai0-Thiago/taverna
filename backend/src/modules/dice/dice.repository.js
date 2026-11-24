import { query } from '../../db/pool.js';

const SELECT = `
  SELECT r.*, u.name AS user_name, u.color AS user_color, u.avatar_file AS user_avatar
    FROM dice_rolls r JOIN users u ON u.id = r.user_id`;

export const diceRepository = {
  async insert({ userId, expression, mode, detail, total, context }) {
    const { rows } = await query(
      `INSERT INTO dice_rolls (user_id, expression, mode, detail, total, context)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, expression, mode, JSON.stringify(detail), total, context ?? null],
    );
    return this.findById(rows[0].id);
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE r.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async recent(limit, after) {
    const { rows } = after
      ? await query(`${SELECT} WHERE r.created_at > $2::timestamptz ORDER BY r.created_at DESC LIMIT $1`, [limit, after])
      : await query(`${SELECT} ORDER BY r.created_at DESC LIMIT $1`, [limit]);
    return rows;
  },
};
