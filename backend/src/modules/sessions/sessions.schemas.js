import { z } from 'zod';
import { isoDate } from '../../utils/validators.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário no formato HH:MM');

export const SESSION_STATUS = ['planned', 'confirmed', 'cancelled'];

export const createSessionSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    scheduledDate: isoDate,
    startTime: time.nullable().optional(),
    location: z.string().trim().max(160).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(SESSION_STATUS).default('planned'),
  })
  .strict();

export const updateSessionSchema = createSessionSchema.partial().strict();

export const listSessionsQuery = z.union([
  z.object({ from: isoDate, to: isoDate }).strict(),
  z.object({ upcoming: z.literal('true'), limit: z.coerce.number().int().min(1).max(50).default(10) }).strict(),
]);
