import { randomUUID } from 'node:crypto';
import { query } from '../../db/pool.js';

const SELECT = `
  SELECT m.*, u.name AS uploader_name, u.color AS uploader_color, u.avatar_file AS uploader_avatar,
         (SELECT CAST(count(*) AS SIGNED) FROM map_pins p WHERE p.asset_id = m.id) AS pin_count
    FROM media_assets m
    LEFT JOIN users u ON u.id = m.uploaded_by`;

export const mediaRepository = {
  async list(kind) {
    const { rows } = kind
      ? await query(`${SELECT} WHERE m.kind = ? ORDER BY m.created_at DESC`, [kind])
      : await query(`${SELECT} ORDER BY m.created_at DESC`);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE m.id = ?`, [id]);
    return rows[0] ?? null;
  },

  async create({ kind, title, description, imageFile }, userId) {
    const id = randomUUID();
    await query(
      `INSERT INTO media_assets (id, kind, title, description, image_file, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, kind, title, description ?? null, imageFile, userId],
    );
    return this.findById(id);
  },

  async update(id, { title, description, imageFile }) {
    const sets = [];
    const values = [];
    const add = (column, value) => {
      if (value === undefined) return;
      values.push(value);
      sets.push(`${column} = ?`);
    };
    add('title', title);
    add('description', description);
    add('image_file', imageFile);
    if (sets.length) {
      values.push(id);
      await query(`UPDATE media_assets SET ${sets.join(', ')} WHERE id = ?`, values);
    }
    return this.findById(id);
  },

  async remove(id) {
    await query('DELETE FROM media_assets WHERE id = ?', [id]);
  },

  // --- pins ---------------------------------------------------------------
  async listPins(assetId) {
    const { rows } = await query(
      `SELECT p.*, u.name AS creator_name, u.color AS creator_color, u.avatar_file AS creator_avatar
         FROM map_pins p LEFT JOIN users u ON u.id = p.created_by
        WHERE p.asset_id = ? ORDER BY p.created_at`,
      [assetId],
    );
    return rows;
  },

  async findPin(assetId, pinId) {
    const { rows } = await query('SELECT * FROM map_pins WHERE id = ? AND asset_id = ?', [pinId, assetId]);
    return rows[0] ?? null;
  },

  async createPin(assetId, { x, y, label, description }, userId) {
    const id = randomUUID();
    await query(
      `INSERT INTO map_pins (id, asset_id, x, y, label, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, assetId, x, y, label, description ?? null, userId],
    );
    return (await this.listPins(assetId)).find((p) => p.id === id);
  },

  async removePin(pinId) {
    await query('DELETE FROM map_pins WHERE id = ?', [pinId]);
  },
};
