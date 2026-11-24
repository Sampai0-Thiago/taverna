import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool, query } from './pool.js';
import { runMigrations } from './migrate.js';

/**
 * Popula o banco com dados de demonstração (idempotente).
 * Senha de todos os usuários: senha1234
 */
const USERS = [
  { name: 'Mestre Kaelen', email: 'mestre@ordem.dev', master: true, color: '#D4A23A' },
  { name: 'Lyra', email: 'lyra@ordem.dev', color: '#22C55E' },
  { name: 'Sarah', email: 'sarah@ordem.dev', color: '#EF4444' },
  { name: 'Pete', email: 'pete@ordem.dev', color: '#A855F7' },
];

function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  await runMigrations();
  const hash = await bcrypt.hash('senha1234', 12);
  const ids = [];
  for (const u of USERS) {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, color, master_token_fp, master_since)
       VALUES ($1, $2, $3, $4, $5::char(64), CASE WHEN $5::text IS NULL THEN NULL ELSE now() END)
       ON CONFLICT (lower(email)) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [u.name, u.email, hash, u.color, u.master ? env.masterTokenFingerprint : null],
    );
    ids.push(rows[0].id);
  }

  const statuses = ['available', 'available', 'maybe', 'unavailable'];
  for (let day = 0; day < 28; day++) {
    for (const [i, id] of ids.entries()) {
      const status = statuses[(day * 7 + i * 3) % statuses.length];
      await query(
        `INSERT INTO availabilities (user_id, date, status) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date) DO NOTHING`,
        [id, isoOffset(day), status],
      );
    }
  }

  const { rows: sessions } = await query(
    `INSERT INTO game_sessions (title, scheduled_date, start_time, location, status, created_by)
     SELECT 'A Floresta Sussurrante', $1, '19:30', 'Casa do Kaelen', 'confirmed', $2
     WHERE NOT EXISTS (SELECT 1 FROM game_sessions) RETURNING id`,
    [isoOffset(5), ids[0]],
  );
  if (sessions[0]) {
    await query(
      `INSERT INTO tavern_items (session_id, name, category, quantity, status, assigned_to, created_by) VALUES
        ($1, 'Salgadinhos', 'food', '3 pacotes', 'claimed', $2, $2),
        ($1, 'Refrigerante', 'drink', '2 L', 'bought', $3, $3),
        ($1, 'Pão de queijo', 'food', '1 kg', 'open', NULL, $4),
        ($1, 'Copos descartáveis', 'utensil', '20', 'open', NULL, $4)`,
      [sessions[0].id, ids[3], ids[2], ids[0]],
    );
  }
  console.log('✓ seed concluído — login: mestre@ordem.dev / senha1234');
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
