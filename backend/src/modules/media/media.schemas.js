import { z } from 'zod';
import { optionalText } from '../../utils/validators.js';

export const MEDIA_KINDS = ['map', 'npc'];

export const listMediaQuery = z.object({ kind: z.enum(MEDIA_KINDS).optional() }).strict();

export const createMediaSchema = z
  .object({
    kind: z.enum(MEDIA_KINDS),
    title: z.string().trim().min(1, 'Informe o título').max(120),
    description: optionalText(4000),
  })
  .strict();

export const updateMediaSchema = createMediaSchema.omit({ kind: true }).partial().strict();

export const pinParams = z.object({ id: z.string().uuid(), pinId: z.string().uuid() });

export const createPinSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    label: z.string().trim().min(1).max(80),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();
