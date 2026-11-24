import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { mailer } from '../../mail/mailer.js';
import { AppError, badRequest } from '../../utils/errors.js';
import { toUserDTO } from '../users/users.mapper.js';
import { usersRepository } from '../users/users.repository.js';
import { emailVerificationRepository as repo } from './emailVerification.repository.js';

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

/** Código numérico aleatório (criptograficamente seguro), com zeros à esquerda. */
export function generateCode() {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

/** Só o HMAC do código vai para o banco: quem ler a tabela não consegue confirmar contas. */
export function hashCode(userId, code) {
  return createHmac('sha256', env.jwtSecret).update(`email-verification:${userId}:${code}`).digest('hex');
}

const tooManyRequests = (message, retryAfter) => new AppError(429, message, 'RATE_LIMITED', { retryAfter });

export const emailVerificationService = {
  /**
   * Gera um novo código, grava e envia por e-mail.
   * `enforceCooldown` evita spam de reenvios (o cadastro não precisa esperar).
   */
  async sendCode(user, { enforceCooldown = true } = {}) {
    if (user.email_verified_at) throw badRequest('Este e-mail já foi confirmado.');

    const now = new Date();
    if (enforceCooldown) {
      const pending = await repo.find(user.id);
      const elapsed = pending ? (now - new Date(pending.last_sent_at)) / 1000 : Infinity;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        throw tooManyRequests(`Aguarde ${wait}s para pedir um novo código.`, wait);
      }
    }

    const code = generateCode();
    await repo.upsert(user.id, {
      codeHash: hashCode(user.id, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000),
      sentAt: now,
    });
    await mailer.sendVerificationCode({ to: user.email, name: user.name, code, ttlMinutes: CODE_TTL_MINUTES });
  },

  /** Envio no cadastro: se o SMTP falhar, a conta é criada mesmo assim e o usuário pode pedir reenvio. */
  async sendCodeOnRegister(user) {
    try {
      await this.sendCode(user, { enforceCooldown: false });
    } catch (error) {
      logger.error({ err: error, userId: user.id }, 'falha ao enviar código de confirmação no cadastro');
    }
  },

  async verify(user, code) {
    if (user.email_verified_at) return toUserDTO(user, { includeEmail: true });

    const pending = await repo.find(user.id);
    if (!pending) throw badRequest('Nenhum código pendente. Peça um novo código.');
    if (new Date(pending.expires_at) < new Date()) throw badRequest('Código expirado. Peça um novo código.');
    if (pending.attempts >= MAX_ATTEMPTS) {
      throw tooManyRequests('Tentativas esgotadas. Peça um novo código.');
    }

    const matches = timingSafeEqual(Buffer.from(hashCode(user.id, code)), Buffer.from(pending.code_hash));
    if (!matches) {
      await repo.incrementAttempts(user.id);
      const left = MAX_ATTEMPTS - pending.attempts - 1;
      throw badRequest(left > 0 ? `Código incorreto. Restam ${left} tentativa(s).` : 'Código incorreto. Peça um novo código.');
    }

    const updated = await usersRepository.update(user.id, { emailVerifiedAt: new Date() });
    await repo.remove(user.id);
    return toUserDTO(updated, { includeEmail: true });
  },
};
