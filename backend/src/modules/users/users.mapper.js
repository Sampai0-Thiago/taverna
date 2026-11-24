import { env } from '../../config/env.js';
import { fileStorage } from '../../storage/fileStorage.js';
import { isActiveMaster } from '../../utils/masterToken.js';

/** Papel efetivo: 'master' enquanto o token de ativação for o token vigente. */
export function roleOf(row) {
  return isActiveMaster(row, env.masterTokenFingerprint) ? 'master' : 'player';
}

/** Converte a linha do banco (snake_case) para o contrato da API (camelCase). */
export function toUserDTO(row, { includeEmail = false } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    ...(includeEmail ? { email: row.email, emailVerified: !!row.email_verified_at } : {}),
    role: roleOf(row),
    masterSince: roleOf(row) === 'master' ? row.master_since : null,
    bio: row.bio,
    color: row.color,
    avatarUrl: fileStorage.url(row.avatar_file),
    diceEnabled: row.dice_enabled,
    createdAt: row.created_at,
  };
}

/** Resumo do autor embutido em outros recursos. */
export function toUserRef(id, name, color, avatarFile) {
  if (!id) return null;
  return { id, name, color, avatarUrl: fileStorage.url(avatarFile) };
}
