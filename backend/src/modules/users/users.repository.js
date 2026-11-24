import { query } from '../../db/pool.js';

/** Acesso a dados de usuários. Só SQL parametrizado; nenhuma regra de negócio aqui. */
const PUBLIC_COLUMNS = `id, name, email, bio, color, avatar_file, dice_enabled, master_token_fp, master_since, created_at`;

export const usersRepository = {
  async findById(id) {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findByEmailWithHash(email) {
    const { rows } = await query(
      `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return rows[0] ?? null;
  },

  async findHashById(id) {
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [id]);
    return rows[0]?.password_hash ?? null;
  },

  async count() {
    const { rows } = await query('SELECT count(*)::int AS total FROM users');
    return rows[0].total;
  },

  async list() {
    const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY name`);
    return rows;
  },

  async create({ name, email, passwordHash, color }) {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, color)
       VALUES ($1, lower($2), $3, COALESCE($4, '#8B5CF6'))
       RETURNING ${PUBLIC_COLUMNS}`,
      [name, email, passwordHash, color ?? null],
    );
    return rows[0];
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
    };
    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        values.push(fields[key]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    if (sets.length === 0) return this.findById(id);
    values.push(id);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${PUBLIC_COLUMNS}`,
      values,
    );
    return rows[0] ?? null;
  },
};
