import { todayISO } from '../../utils/date.js';
import { notFound } from '../../utils/errors.js';
import { assertCanManage } from '../../utils/permissions.js';
import { toUserRef } from '../users/users.mapper.js';
import { sessionsRepository } from './sessions.repository.js';

export function toSessionDTO(row) {
  return {
    id: row.id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    startTime: row.start_time_text,
    location: row.location,
    description: row.description,
    status: row.status,
    createdBy: toUserRef(row.created_by, row.creator_name, row.creator_color, row.creator_avatar),
    createdAt: row.created_at,
  };
}

async function getOrFail(id) {
  const row = await sessionsRepository.findById(id);
  if (!row) throw notFound('Sessão não encontrada');
  return row;
}

export const sessionsService = {
  async list(q, today = todayISO()) {
    const rows = q.upcoming
      ? await sessionsRepository.listUpcoming(today, q.limit)
      : await sessionsRepository.listInRange(q.from, q.to);
    return rows.map(toSessionDTO);
  },

  async get(id) {
    return toSessionDTO(await getOrFail(id));
  },

  async create(user, data) {
    return toSessionDTO(await sessionsRepository.create(data, user.id));
  },

  async update(user, id, data) {
    const current = await getOrFail(id);
    assertCanManage(user, current.created_by, 'Só quem criou a sessão ou o mestre pode alterá-la.');
    return toSessionDTO(await sessionsRepository.update(id, data));
  },

  async remove(user, id) {
    const current = await getOrFail(id);
    assertCanManage(user, current.created_by, 'Só quem criou a sessão ou o mestre pode excluí-la.');
    await sessionsRepository.remove(id);
  },
};
