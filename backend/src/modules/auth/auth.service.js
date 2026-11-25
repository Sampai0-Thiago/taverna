import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { AppError, conflict, forbidden, unauthorized } from '../../utils/errors.js';
import { PRIVACY_POLICY_VERSION } from '../../config/privacy.js';
import { toUserDTO } from '../users/users.mapper.js';
import { usersRepository } from '../users/users.repository.js';
import { BCRYPT_ROUNDS } from '../users/users.service.js';
import { emailVerificationService } from './emailVerification.service.js';
import { signToken } from './token.js';

export const MAX_FAILED_LOGINS = 10;
export const LOCK_MINUTES = 15;

// Hash fictício: mantém o tempo de resposta igual quando o e-mail não existe (evita enumeração).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

function safeEqual(a, b) {
  const ba = Buffer.from(a ?? '');
  const bb = Buffer.from(b ?? '');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export const authService = {
  async register({ name, email, password, color, inviteCode }) {
    // (acceptPrivacy já foi exigido pelo schema; aqui só registramos a versão aceita)
    if (env.inviteCode && !safeEqual(inviteCode, env.inviteCode)) {
      throw forbidden('Código de convite inválido.');
    }
    if (await usersRepository.findByEmailWithHash(email)) {
      throw conflict('Este e-mail já está cadastrado.');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Todo cadastro começa como jogador; o modo mestre é ativado depois, com o MASTER_TOKEN.
    const user = await usersRepository.create({ name, email, passwordHash, color, privacyVersion: PRIVACY_POLICY_VERSION });
    await emailVerificationService.sendCodeOnRegister(user);

    return { user: toUserDTO(user, { includeEmail: true }), token: signToken(user) };
  },

  /**
   * Login com bloqueio por conta: após MAX_FAILED_LOGINS senhas erradas seguidas, a conta fica
   * bloqueada por LOCK_MINUTES. Complementa o limite por IP (que pode ser contornado trocando de IP).
   */
  async login({ email, password }) {
    const user = await usersRepository.findByEmailWithHash(email);
    const now = new Date();
    if (user?.locked_until && new Date(user.locked_until) > now) {
      const minutes = Math.ceil((new Date(user.locked_until) - now) / 60_000);
      throw new AppError(
        429,
        `Conta bloqueada por excesso de tentativas. Tente de novo em ${minutes} min ou use "Esqueceu a senha?".`,
        'ACCOUNT_LOCKED',
      );
    }

    const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid) {
      if (user) {
        const failed = (user.failed_logins ?? 0) + 1;
        const lock = failed >= MAX_FAILED_LOGINS;
        await usersRepository.update(user.id, {
          failedLogins: lock ? 0 : failed,
          ...(lock ? { lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) } : {}),
        });
      }
      throw unauthorized('E-mail ou senha incorretos.');
    }

    if (user.failed_logins || user.locked_until) {
      await usersRepository.update(user.id, { failedLogins: 0, lockedUntil: null });
    }
    return { user: toUserDTO(user, { includeEmail: true }), token: signToken(user) };
  },
};
