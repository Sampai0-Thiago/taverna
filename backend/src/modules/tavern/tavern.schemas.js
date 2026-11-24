import { z } from 'zod';

export const TAVERN_CATEGORIES = ['food', 'drink', 'utensil', 'other'];

export const listItemsQuery = z
  .object({
    // UUID da sessão, ou "general" para a lista sem sessão
    sessionId: z.union([z.string().uuid(), z.literal('general')]).default('general'),
  })
  .strict();

export const createItemSchema = z
  .object({
    sessionId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1, 'Informe o item').max(100),
    category: z.enum(TAVERN_CATEGORIES).default('food'),
    quantity: z.string().trim().max(40).nullable().optional(),
    notes: z.string().trim().max(300).nullable().optional(),
    claim: z.boolean().default(false), // "eu levo" já no cadastro
  })
  .strict();

export const updateItemSchema = createItemSchema.omit({ sessionId: true, claim: true }).partial().strict();

export const statusSchema = z.object({ status: z.enum(['claimed', 'bought']) }).strict();
