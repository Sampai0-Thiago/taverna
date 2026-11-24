import { conflict, notFound } from '../../utils/errors.js';
import { assertCanManage } from '../../utils/permissions.js';
import { toUserRef } from '../users/users.mapper.js';
import { tavernRepository } from './tavern.repository.js';
import { claimTransition, releaseTransition, statusTransition } from './tavern.rules.js';

function toItemDTO(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    notes: row.notes,
    status: row.status,
    assignedTo: toUserRef(row.assigned_to, row.assignee_name, row.assignee_color, row.assignee_avatar),
    createdBy: toUserRef(row.created_by, row.creator_name, row.creator_color, row.creator_avatar),
    createdAt: row.created_at,
  };
}

async function getOrFail(id) {
  const row = await tavernRepository.findById(id);
  if (!row) throw notFound('Item não encontrado');
  return row;
}

async function applyTransition(id, user, rule) {
  const item = await getOrFail(id);
  const next = rule(item, user);
  const updated = await tavernRepository.transition(id, item.status, next);
  if (!updated) throw conflict('O item foi alterado por outra pessoa. Atualize a lista.');
  return toItemDTO(updated);
}

export const tavernService = {
  async list(sessionId) {
    return (await tavernRepository.list(sessionId === 'general' ? null : sessionId)).map(toItemDTO);
  },

  async create(user, data) {
    return toItemDTO(await tavernRepository.create(data, user.id));
  },

  async update(user, id, data) {
    const item = await getOrFail(id);
    assertCanManage(user, item.created_by, 'Só quem criou o item ou o mestre pode editá-lo.');
    return toItemDTO(await tavernRepository.update(id, data));
  },

  claim: (user, id) => applyTransition(id, user, claimTransition),
  release: (user, id) => applyTransition(id, user, releaseTransition),
  setStatus: (user, id, status) => applyTransition(id, user, (item, u) => statusTransition(item, u, status)),

  async remove(user, id) {
    const item = await getOrFail(id);
    assertCanManage(user, item.created_by, 'Só quem criou o item ou o mestre pode excluí-lo.');
    await tavernRepository.remove(id);
  },
};
