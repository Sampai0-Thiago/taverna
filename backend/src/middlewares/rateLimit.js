import rateLimit from 'express-rate-limit';

/** Limita tentativas em rotas sensíveis a força bruta (login, cadastro, token de mestre). */
export function bruteForceLimiter({ limit = 20, windowMinutes = 15 } = {}) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em alguns minutos.' } },
  });
}
