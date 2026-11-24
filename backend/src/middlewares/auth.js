import { verifyToken, AUTH_COOKIE } from '../modules/auth/token.js';
import { roleOf } from '../modules/users/users.mapper.js';
import { usersRepository } from '../modules/users/users.repository.js';
import { forbidden, unauthorized } from '../utils/errors.js';

/**
 * Exige um usuário autenticado (cookie httpOnly com JWT).
 * O usuário é recarregado do banco: contas removidas, ativação/desativação do modo
 * mestre e troca do MASTER_TOKEN refletem imediatamente, sem esperar o JWT expirar.
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized('Sessão expirada. Entre novamente.');
  }

  const user = await usersRepository.findById(payload.sub);
  if (!user) throw unauthorized('Conta não encontrada.');
  req.user = { ...user, role: roleOf(user) }; // papel efetivo, recalculado a cada requisição
  next();
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) throw forbidden('Apenas quem está com o modo mestre ativo pode fazer isso.');
    next();
  };
}
