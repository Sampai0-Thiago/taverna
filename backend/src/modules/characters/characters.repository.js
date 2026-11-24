import { randomUUID } from 'node:crypto';
import { query } from '../../db/pool.js';

const SELECT = `
  SELECT c.*, u.name AS owner_name, u.color AS owner_color, u.avatar_file AS owner_avatar
    FROM characters c
    JOIN users u ON u.id = c.owner_id`;

const COLUMNS = {
  name: 'name',
  className: 'class_name',
  race: 'race',
  level: 'level',
  summary: 'summary',
  portraitFile: 'portrait_file',
  sheetFile: 'sheet_file',
  sheetOriginalName: 'sheet_original_name',
};

export const charactersRepository = {
  async list() {
    const { rows } = await query(`${SELECT} ORDER BY c.name`);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE c.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async create(ownerId, data) {
    const id = randomUUID();
    await query(
      `INSERT INTO characters (id, owner_id, name, class_name, race, level, summary, portrait_file, sheet_file, sheet_original_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ownerId,
        data.name,
        data.className ?? null,
        data.race ?? null,
        data.level,
        data.summary ?? null,
        data.portraitFile ?? null,
        data.sheetFile ?? null,
        data.sheetOriginalName ?? null,
      ],
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
      await query(`UPDATE characters SET ${sets.join(', ')} WHERE id = ?`, values);
    }
    return this.findById(id);
  },

  async remove(id) {
    await query('DELETE FROM characters WHERE id = ?', [id]);
  },
};
