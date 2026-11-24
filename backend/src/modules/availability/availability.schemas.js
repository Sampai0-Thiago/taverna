import { z } from 'zod';
import { isoDate } from '../../utils/validators.js';

export const AVAILABILITY_STATUS = ['available', 'maybe', 'unavailable'];

export const bulkAvailabilitySchema = z
  .object({
    entries: z
      .array(
        z.object({
          date: isoDate,
          status: z.enum(AVAILABILITY_STATUS).nullable(), // null = limpar marcação
          note: z.string().trim().max(140).nullable().optional(),
        }),
      )
      .min(1)
      .max(120)
      .refine((list) => new Set(list.map((e) => e.date)).size === list.length, 'Datas repetidas'),
  })
  .strict();
