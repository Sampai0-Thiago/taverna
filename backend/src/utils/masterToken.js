import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Regras do token de mestre — funções puras (o segredo é passado como parâmetro),
 * testadas em tests/masterToken.test.js.
 */

/** Impressão digital do token: HMAC-SHA256(segredo, token). O token em si nunca é salvo. */
export function tokenFingerprint(token, secret) {
  return createHmac('sha256', secret).update(String(token)).digest('hex');
}

/** Comparação em tempo constante (não vaza, pelo tempo de resposta, quantos caracteres acertou). */
export function sameFingerprint(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** O usuário é mestre se ativou com o token que está valendo agora. */
export function isActiveMaster(userRow, currentFingerprint) {
  return sameFingerprint(userRow?.master_token_fp, currentFingerprint);
}
