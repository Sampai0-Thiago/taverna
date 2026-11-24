import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { conflict, forbidden, unauthorized } from '../../utils/errors.js';
import { toUserDTO } from '../users/users.mapper.js';
import { usersRepository } from '../users/users.repository.js';
import { BCRYPT_ROUNDS } from '../users/users.service.js';
import { emailVerificationService } from './emailVerification.service.js';
import { signToken } from './token.js';

// Hash fictício: mantém o tempo de resposta igual quando o e-mail não existe (evita enumeração).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

function safeEqual(a, b) {
  const ba = Buffer.from(a ?? '');
  const bb = Buffer.from(b ?? '');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export const authService = {
  async register({ name, email, password, color, inviteCode }) {
    if (env.inviteCode && !safeEqual(inviteCode, env.inviteCode)) {
      throw forbidden('Código de convite inválido.');
    }
    if (await usersRepository.findByEmailWithHash(email)) {
      throw conflict('Este e-mail já está cadastrado.');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Todo cadastro começa como jogador; o modo mestre é ativado depois, com o MASTER_TOKEN.
    const user = await usersRepository.create({ name, email, passwordHash, color });
    await emailVerificationService.sendCodeOnRegister(user);

    return { user: toUserDTO(user, { includeEmail: true }), token: signToken(user) };
  },

  async login({ email, password }) {
    const user = await usersRepository.findByEmailWithHash(email);
    const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid) throw unauthorized('E-mail ou senha incorretos.');
    return { user: toUserDTO(user, { includeEmail: true }), token: signToken(user) };
  },
};
