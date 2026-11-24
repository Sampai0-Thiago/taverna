import { randomUUID } from 'node:crypto';
import { query } from '../../db/pool.js';

const SELECT = `
  SELECT s.*, TIME_FORMAT(s.start_time, '%H:%i') AS start_time_text,
         u.name AS creator_name, u.color AS creator_color, u.avatar_file AS creator_avatar
    FROM game_sessions s
    LEFT JOIN users u ON u.id = s.created_by`;

const COLUMNS = {
  title: 'title',
  scheduledDate: 'scheduled_date',
  startTime: 'start_time',
  location: 'location',
  description: 'description',
  status: 'status',
};

export const sessionsRepository = {
  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE s.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async listInRange(from, to) {
    const { rows } = await query(
      `${SELECT} WHERE s.scheduled_date BETWEEN ? AND ? ORDER BY s.scheduled_date, s.start_time IS NULL, s.start_time`,
      [from, to],
    );
    return rows;
  },

  async listUpcoming(today, limit) {
    const { rows } = await query(
      `${SELECT} WHERE s.scheduled_date >= ? AND s.status <> 'cancelled'
        ORDER BY s.scheduled_date, s.start_time IS NULL, s.start_time LIMIT ?`,
      [today, limit],
    );
    return rows;
  },

  async create(data, userId) {
    const id = randomUUID();
    await query(
      `INSERT INTO game_sessions (id, title, scheduled_date, start_time, location, description, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.title, data.scheduledDate, data.startTime ?? null, data.location ?? null, data.description ?? null, data.status, userId],
    );
    return this.findById(id);
  },

  async update(id, data) {
    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(COLUMNS)) {
      if (data[key] !== undefined) {
        values.push(data[key]);
        sets.push(`${column} = ?`);
      }
    }
    if (sets.length) {
      values.push(id);
      await query(`UPDATE game_sessions SET ${sets.join(', ')} WHERE id = ?`, values);
    }
    return this.findById(id);
  },

  async remove(id) {
    await query('DELETE FROM game_sessions WHERE id = ?', [id]);
  },
};
