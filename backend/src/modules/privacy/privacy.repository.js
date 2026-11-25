import { query, withTransaction } from '../../db/pool.js';

/** Consultas dos direitos do titular (LGPD art. 18): exportação e eliminação dos dados. */
export const privacyRepository = {
  /** Tudo o que a aplicação guarda sobre a pessoa (ou que ela criou). */
  async collect(userId) {
    const one = async (sql) => (await query(sql, [userId])).rows;
    const [profile] = await one(
      `SELECT id, name, email, bio, color, avatar_file, dice_enabled, master_token_fp, master_since, email_verified_at,
              password_changed_at, privacy_accepted_at, privacy_version, created_at, updated_at
         FROM users WHERE id = ?`,
    );
    return {
      profile,
      availability: await one('SELECT date, status, note, updated_at FROM availabilities WHERE user_id = ? ORDER BY date'),
      characters: await one(
        `SELECT id, name, class_name, race, level, summary, portrait_file, sheet_file, sheet_original_name, created_at, updated_at
           FROM characters WHERE owner_id = ? ORDER BY created_at`,
      ),
      diceRolls: await one(
        'SELECT id, expression, mode, detail, total, context, created_at FROM dice_rolls WHERE user_id = ? ORDER BY created_at',
      ),
      sessionsCreated: await one(
        `SELECT id, title, scheduled_date, TIME_FORMAT(start_time, '%H:%i') AS start_time, location, description, status, created_at
           FROM game_sessions WHERE created_by = ? ORDER BY scheduled_date`,
      ),
      tavernItems: await this.tavernItemsOf(userId),
      mediaUploaded: await one(
        'SELECT id, kind, title, description, image_file, created_at FROM media_assets WHERE uploaded_by = ? ORDER BY created_at',
      ),
      mapPinsCreated: await one('SELECT id, asset_id, x, y, label, description, created_at FROM map_pins WHERE created_by = ?'),
    };
  },

  async tavernItemsOf(userId) {
    const { rows } = await query(
      `SELECT id, session_id, name, category, quantity, notes, status, (assigned_to <=> ?) AS assigned_to_me, created_at
         FROM tavern_items WHERE created_by = ? OR assigned_to = ? ORDER BY created_at`,
      [userId, userId, userId],
    );
    return rows;
  },

  /** Arquivos pessoais que precisam ser apagados do armazenamento junto com a conta. */
  async personalFiles(userId) {
    const { rows: [user] } = await query('SELECT avatar_file FROM users WHERE id = ?', [userId]);
    const { rows: chars } = await query('SELECT portrait_file, sheet_file FROM characters WHERE owner_id = ?', [userId]);
    return [user?.avatar_file, ...chars.flatMap((c) => [c.portrait_file, c.sheet_file])].filter(Boolean);
  },

  /**
   * Elimina a conta. Em cascata (FK): agenda, personagens, rolagens, códigos pendentes.
   * Itens da Taverna que a pessoa levaria voltam a ficar "abertos" para o grupo.
   * Conteúdo do grupo que ela criou (sessões, mapas, marcadores, itens) permanece, sem autor.
   */
  async deleteUser(userId) {
    await withTransaction(async (client) => {
      await client.query("UPDATE tavern_items SET status = 'open', assigned_to = NULL WHERE assigned_to = ?", [userId]);
      await client.query('DELETE FROM users WHERE id = ?', [userId]);
    });
  },
};
