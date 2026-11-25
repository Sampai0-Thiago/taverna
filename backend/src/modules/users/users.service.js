import bcrypt from 'bcryptjs';
import { fileStorage } from '../../storage/fileStorage.js';
import { env } from '../../config/env.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import { tokenFingerprint, sameFingerprint } from '../../utils/masterToken.js';
import { toUserDTO } from './users.mapper.js';
import { usersRepository } from './users.repository.js';

export const BCRYPT_ROUNDS = 12;

export const usersService = {
  async list() {
    return (await usersRepository.list()).map((u) => toUserDTO(u));
  },

  async get(id) {
    const user = await usersRepository.findById(id);
    if (!user) throw notFound('Usuário não encontrado');
    return toUserDTO(user);
  },

  async updateProfile(userId, data) {
    return toUserDTO(await usersRepository.update(userId, data), { includeEmail: true });
  },

  async updatePreferences(userId, { diceEnabled }) {
    return toUserDTO(await usersRepository.update(userId, { diceEnabled }), { includeEmail: true });
  },

  async updateAvatar(user, fileName) {
    if (!fileName) throw badRequest('Envie uma imagem no campo "avatar".');
    const updated = await usersRepository.update(user.id, { avatarFile: fileName });
    await fileStorage.remove(user.avatar_file); // remove o avatar antigo só depois de gravar o novo
    return toUserDTO(updated, { includeEmail: true });
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const hash = await usersRepository.findHashById(userId);
    if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
      throw badRequest('Senha atual incorreta.');
    }
    // passwordChangedAt invalida os logins emitidos antes (encerra as sessões em outros aparelhos)
    return usersRepository.update(userId, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
      passwordChangedAt: new Date(),
    });
  },

  /**
   * Ativa o modo mestre para quem informar o MASTER_TOKEN correto.
   * Pode haver mais de um mestre ao mesmo tempo (ex.: jogos diferentes, co-mestres).
   */
  async activateMaster(user, token) {
    const fingerprint = tokenFingerprint(token, env.jwtSecret);
    if (!sameFingerprint(fingerprint, env.masterTokenFingerprint)) {
      throw forbidden('Token de mestre inválido.');
    }
    const updated = await usersRepository.update(user.id, { masterTokenFp: fingerprint, masterSince: new Date() });
    return toUserDTO(updated, { includeEmail: true });
  },

  /** Volta a ser jogador (ex.: fim da campanha, outro jogador vai mestrar). */
  async deactivateMaster(user) {
    const updated = await usersRepository.update(user.id, { masterTokenFp: null, masterSince: null });
    return toUserDTO(updated, { includeEmail: true });
  },
};
