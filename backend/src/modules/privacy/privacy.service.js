import bcrypt from 'bcryptjs';
import { PRIVACY_POLICY_VERSION } from '../../config/privacy.js';
import { logger } from '../../config/logger.js';
import { fileStorage } from '../../storage/fileStorage.js';
import { badRequest } from '../../utils/errors.js';
import { roleOf } from '../users/users.mapper.js';
import { usersRepository } from '../users/users.repository.js';
import { privacyRepository } from './privacy.repository.js';

const fileUrl = (name) => fileStorage.url(name);

export const privacyService = {
  /**
   * LGPD art. 18, II e V — acesso e portabilidade: todos os dados da pessoa em JSON legível.
   * Arquivos (avatar, retratos, fichas) vão como links; a pessoa pode baixá-los logada.
   */
  async exportData(userId) {
    const data = await privacyRepository.collect(userId);
    const p = data.profile;
    return {
      exportedAt: new Date().toISOString(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      account: {
        id: p.id,
        name: p.name,
        email: p.email,
        bio: p.bio,
        color: p.color,
        avatarUrl: fileUrl(p.avatar_file),
        diceEnabled: p.dice_enabled,
        role: roleOf(p),
        masterSince: p.master_since,
        emailVerifiedAt: p.email_verified_at,
        passwordChangedAt: p.password_changed_at,
        privacyAcceptedAt: p.privacy_accepted_at,
        privacyVersionAccepted: p.privacy_version,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      },
      availability: data.availability.map((a) => ({ date: a.date, status: a.status, note: a.note, updatedAt: a.updated_at })),
      characters: data.characters.map((c) => ({
        id: c.id,
        name: c.name,
        className: c.class_name,
        race: c.race,
        level: c.level,
        summary: c.summary,
        portraitUrl: fileUrl(c.portrait_file),
        sheetUrl: fileUrl(c.sheet_file),
        sheetOriginalName: c.sheet_original_name,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      diceRolls: data.diceRolls.map((r) => ({
        id: r.id,
        expression: r.expression,
        mode: r.mode,
        total: r.total,
        detail: typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail,
        context: r.context,
        createdAt: r.created_at,
      })),
      sessionsCreated: data.sessionsCreated.map((s) => ({
        id: s.id,
        title: s.title,
        scheduledDate: s.scheduled_date,
        startTime: s.start_time,
        location: s.location,
        description: s.description,
        status: s.status,
        createdAt: s.created_at,
      })),
      tavernItems: data.tavernItems.map((t) => ({
        id: t.id,
        sessionId: t.session_id,
        name: t.name,
        category: t.category,
        quantity: t.quantity,
        notes: t.notes,
        status: t.status,
        assignedToMe: Boolean(t.assigned_to_me),
        createdAt: t.created_at,
      })),
      mediaUploaded: data.mediaUploaded.map((m) => ({
        id: m.id,
        kind: m.kind,
        title: m.title,
        description: m.description,
        imageUrl: fileUrl(m.image_file),
        createdAt: m.created_at,
      })),
      mapPinsCreated: data.mapPinsCreated.map((pin) => ({
        id: pin.id,
        mapId: pin.asset_id,
        x: Number(pin.x),
        y: Number(pin.y),
        label: pin.label,
        description: pin.description,
        createdAt: pin.created_at,
      })),
    };
  },

  /**
   * LGPD art. 18, VI — eliminação. Exige a senha atual (evita exclusão por sessão esquecida
   * aberta ou por terceiros). Apaga o registro e os arquivos pessoais (avatar, retratos, fichas).
   */
  async deleteAccount(userId, password) {
    const hash = await usersRepository.findHashById(userId);
    if (!hash || !(await bcrypt.compare(password, hash))) throw badRequest('Senha incorreta.');

    const files = await privacyRepository.personalFiles(userId);
    await privacyRepository.deleteUser(userId);
    await fileStorage.removeMany(files);
    logger.info('conta excluída a pedido do titular'); // sem dados pessoais no log
  },
};
