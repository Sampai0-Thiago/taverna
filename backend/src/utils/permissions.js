import { forbidden } from './errors.js';

/** Regra única de autorização de escrita: dono do recurso ou mestre. */
export function canManage(user, ownerId) {
  return user.role === 'master' || (ownerId != null && user.id === ownerId);
}

export function assertCanManage(user, ownerId, message) {
  if (!canManage(user, ownerId)) throw forbidden(message);
}
