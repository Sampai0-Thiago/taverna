import { randomUUID } from 'node:crypto';
import { query } from '../../db/pool.js';

/** Acesso a dados de usuários. Só SQL parametrizado; nenhuma regra de negócio aqui. */
const PUBLIC_COLUMNS = `id, name, email, bio, color, avatar_file, dice_enabled, master_token_fp, master_since,
  email_verified_at, password_changed_at, created_at`;

export const usersRepository = {
  async findById(id) {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
    return rows[0] ?? null;
  },

  /** E-mails são gravados em minúsculas (ver create), então a busca compara em minúsculas também. */
  async findByEmailWithHash(email) {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = ?`, [
      email.toLowerCase(),
    ]);
    return rows[0] ?? null;
  },

  async findHashById(id) {
    const { rows } = await query('SELECT password_hash FROM users WHERE id = ?', [id]);
    return rows[0]?.password_hash ?? null;
  },

  async count() {
    const { rows } = await query('SELECT CAST(count(*) AS SIGNED) AS total FROM users');
    return Number(rows[0].total);
  },

  async list() {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY name`);
    return rows;
  },

  async create({ name, email, passwordHash, color }) {
    const id = randomUUID();
    await query(
      `INSERT INTO users (id, name, email, password_hash, color)
       VALUES (?, ?, ?, ?, COALESCE(?, '#8B5CF6'))`,
      [id, name, email.toLowerCase(), passwordHash, color ?? null],
    );
    return this.findById(id);
  },

  /** Atualiza apenas as colunas permitidas que vierem definidas. */
  async update(id, fields) {
    const allowed = {
      name: 'name',
      bio: 'bio',
      color: 'color',
      avatarFile: 'avatar_file',
      diceEnabled: 'dice_enabled',
      masterTokenFp: 'master_token_fp',
      masterSince: 'master_since',
      passwordHash: 'password_hash',
      emailVerifiedAt: 'email_verified_at',
      passwordChangedAt: 'password_changed_at',
    };
    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        values.push(fields[key]);
        sets.push(`${column} = ?`);
      }
    }
    if (sets.length) {
      values.push(id);
      await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
    }
    return this.findById(id);
  },
};
