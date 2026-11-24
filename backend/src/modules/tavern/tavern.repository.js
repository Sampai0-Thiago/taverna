import { randomUUID } from 'node:crypto';
import { query } from '../../db/pool.js';

const SELECT = `
  SELECT t.*,
         a.name AS assignee_name, a.color AS assignee_color, a.avatar_file AS assignee_avatar,
         c.name AS creator_name,  c.color AS creator_color,  c.avatar_file AS creator_avatar
    FROM tavern_items t
    LEFT JOIN users a ON a.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by`;

export const tavernRepository = {
  async list(sessionId) {
    const { rows } = sessionId
      ? await query(`${SELECT} WHERE t.session_id = ? ORDER BY t.category, t.created_at`, [sessionId])
      : await query(`${SELECT} WHERE t.session_id IS NULL ORDER BY t.category, t.created_at`);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE t.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async create(data, userId) {
    const id = randomUUID();
    await query(
      `INSERT INTO tavern_items (id, session_id, name, category, quantity, notes, status, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.sessionId ?? null,
        data.name,
        data.category,
        data.quantity ?? null,
        data.notes ?? null,
        data.claim ? 'claimed' : 'open',
        data.claim ? userId : null,
        userId,
      ],
    );
    return this.findById(id);
  },

  async update(id, { name, category, quantity, notes }) {
    const sets = [];
    const values = [];
    for (const [column, value] of Object.entries({ name, category, quantity, notes })) {
      if (value === undefined) continue;
      values.push(value);
      sets.push(`${column} = ?`);
    }
    if (sets.length) {
      values.push(id);
      await query(`UPDATE tavern_items SET ${sets.join(', ')} WHERE id = ?`, values);
    }
    return this.findById(id);
  },

  /**
   * Transição com controle de concorrência otimista: só aplica se o status
   * ainda for o esperado. Retorna null se outra pessoa mudou o item antes.
   */
  async transition(id, expectedStatus, { status, assignedTo }) {
    const { rowCount } = await query(
      `UPDATE tavern_items SET status = ?, assigned_to = ? WHERE id = ? AND status = ?`,
      [status, assignedTo, id, expectedStatus],
    );
    return rowCount ? this.findById(id) : null;
  },

  async remove(id) {
    await query('DELETE FROM tavern_items WHERE id = ?', [id]);
  },
};
