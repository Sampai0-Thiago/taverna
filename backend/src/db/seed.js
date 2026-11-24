import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool, query } from './pool.js';
import { runMigrations } from './migrate.js';

/**
 * Popula o banco com dados de demonstração (idempotente).
 * Senha de todos os usuários: senha1234 (e-mails já confirmados).
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
    const now = new Date();
    await query(
      `INSERT INTO users (id, name, email, password_hash, color, master_token_fp, master_since, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [randomUUID(), u.name, u.email, hash, u.color, u.master ? env.masterTokenFingerprint : null, u.master ? now : null, now],
    );
    const { rows } = await query('SELECT id FROM users WHERE email = ?', [u.email]);
    ids.push(rows[0].id);
  }

  const statuses = ['available', 'available', 'maybe', 'unavailable'];
  for (let day = 0; day < 28; day++) {
    for (const [i, id] of ids.entries()) {
      const status = statuses[(day * 7 + i * 3) % statuses.length];
      await query('INSERT IGNORE INTO availabilities (user_id, date, status) VALUES (?, ?, ?)', [id, isoOffset(day), status]);
    }
  }

  const { rows: existing } = await query('SELECT 1 FROM game_sessions LIMIT 1');
  if (existing.length === 0) {
    const sessionId = randomUUID();
    await query(
      `INSERT INTO game_sessions (id, title, scheduled_date, start_time, location, status, created_by)
       VALUES (?, 'A Floresta Sussurrante', ?, '19:30', 'Casa do Kaelen', 'confirmed', ?)`,
      [sessionId, isoOffset(5), ids[0]],
    );
    const items = [
      ['Salgadinhos', 'food', '3 pacotes', 'claimed', ids[3], ids[3]],
      ['Refrigerante', 'drink', '2 L', 'bought', ids[2], ids[2]],
      ['Pão de queijo', 'food', '1 kg', 'open', null, ids[0]],
      ['Copos descartáveis', 'utensil', '20', 'open', null, ids[0]],
    ];
    for (const [name, category, quantity, status, assignedTo, createdBy] of items) {
      await query(
        `INSERT INTO tavern_items (id, session_id, name, category, quantity, status, assigned_to, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), sessionId, name, category, quantity, status, assignedTo, createdBy],
      );
    }
  }
  console.log('✓ seed concluído — login: mestre@ordem.dev / senha1234');
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
