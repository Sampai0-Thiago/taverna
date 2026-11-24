import { todayISO } from '../../utils/date.js';
import { usersRepository } from '../users/users.repository.js';
import { availabilityRepository } from './availability.repository.js';
import { rankBestDates, summarizeAvailability } from './availability.summary.js';

const toEntryDTO = (row) => ({ userId: row.user_id, date: row.date, status: row.status, note: row.note });

export const availabilityService = {
  async list({ from, to }) {
    return (await availabilityRepository.listInRange(from, to)).map(toEntryDTO);
  },

  async saveMine(userId, entries) {
    await availabilityRepository.bulkUpsert(userId, entries);
  },

  /** Compara a agenda de todos os membros e sugere as melhores datas. */
  async summary({ from, to }, today = todayISO()) {
    const [entries, members] = await Promise.all([
      this.list({ from, to }),
      usersRepository.list(),
    ]);
    const days = summarizeAvailability({ entries, memberIds: members.map((m) => m.id), from, to });
    return {
      memberCount: members.length,
      days,
      bestDates: rankBestDates(days, { notBefore: today }),
    };
  },
};
