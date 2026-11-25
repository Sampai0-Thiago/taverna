import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { mailer } from '../../mail/mailer.js';
import { AppError, badRequest } from '../../utils/errors.js';
import { toUserDTO } from '../users/users.mapper.js';
import { usersRepository } from '../users/users.repository.js';
import { BCRYPT_ROUNDS } from '../users/users.service.js';
import { emailVerificationRepository } from './emailVerification.repository.js';
import {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  generateCode,
} from './emailVerification.service.js';
import { passwordResetRepository as repo } from './passwordReset.repository.js';
import { signToken } from './token.js';

/** HMAC com finalidade própria: um código de confirmação de e-mail nunca vale como código de recuperação. */
export function hashResetCode(userId, code) {
  return createHmac('sha256', env.jwtSecret).update(`password-reset:${userId}:${code}`).digest('hex');
}

// Mesma mensagem para e-mail inexistente, sem código pendente ou código expirado: não revela quem tem conta.
const INVALID = 'Código inválido ou expirado. Peça um novo código.';

export const passwordResetService = {
  /**
   * Envia o código de recuperação, se o e-mail tiver conta.
   * Nunca informa ao cliente se a conta existe; o controller responde 204 sem esperar este trabalho
   * (assim o tempo de resposta também não denuncia a existência da conta).
   */
  async requestReset(email) {
    const user = await usersRepository.findByEmailWithHash(email);
    if (!user) return;

    const now = new Date();
    const pending = await repo.find(user.id);
    if (pending && (now - new Date(pending.last_sent_at)) / 1000 < RESEND_COOLDOWN_SECONDS) return;

    const code = generateCode();
    await repo.upsert(user.id, {
      codeHash: hashResetCode(user.id, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000),
      sentAt: now,
    });
    await mailer.sendPasswordResetCode({ to: user.email, name: user.name, code, ttlMinutes: CODE_TTL_MINUTES });
  },

  /** Dispara o envio em segundo plano, registrando falhas no log. */
  requestResetInBackground(email) {
    this.requestReset(email).catch((error) => logger.error({ err: error }, 'falha ao enviar código de recuperação de senha'));
  },

  /**
   * Confere o código e troca a senha. Também confirma o e-mail (a pessoa provou que o recebe)
   * e encerra as sessões abertas em outros aparelhos. Devolve o usuário já logado.
   */
  async reset({ email, code, newPassword }) {
    const user = await usersRepository.findByEmailWithHash(email);
    const pending = user ? await repo.find(user.id) : null;
    if (!user || !pending || new Date(pending.expires_at) < new Date()) throw badRequest(INVALID);
    if (pending.attempts >= MAX_ATTEMPTS) {
      throw new AppError(429, 'Tentativas esgotadas. Peça um novo código.', 'RATE_LIMITED');
    }

    const matches = timingSafeEqual(Buffer.from(hashResetCode(user.id, code)), Buffer.from(pending.code_hash));
    if (!matches) {
      await repo.incrementAttempts(user.id);
      const left = MAX_ATTEMPTS - pending.attempts - 1;
      throw badRequest(left > 0 ? `Código incorreto. Restam ${left} tentativa(s).` : 'Código incorreto. Peça um novo código.');
    }

    const now = new Date();
    const updated = await usersRepository.update(user.id, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
      passwordChangedAt: now,
      failedLogins: 0, // quem provou ter acesso ao e-mail destrava a conta
      lockedUntil: null,
      ...(user.email_verified_at ? {} : { emailVerifiedAt: now }),
    });
    await repo.remove(user.id);
    await emailVerificationRepository.remove(user.id);
    return { user: toUserDTO(updated, { includeEmail: true }), token: signToken(updated) };
  },
};
