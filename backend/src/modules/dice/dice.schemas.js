import { z } from 'zod';

export const rollSchema = z
  .object({
    expression: z.string().trim().min(1).max(60),
    mode: z.enum(['normal', 'advantage', 'disadvantage']).default('normal'),
    context: z.string().trim().max(40).nullable().optional(), // aba onde a rolagem foi feita
  })
  .strict();

export const historyQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    // só rolagens posteriores a este instante (feed em tempo real)
    after: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
