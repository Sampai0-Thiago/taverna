import { z } from 'zod';
import { optionalText } from '../../utils/validators.js';

// Corpo multipart/form-data: todos os valores chegam como string.
export const createCharacterSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome').max(80),
    className: optionalText(60),
    race: optionalText(60),
    level: z.coerce.number().int().min(1).max(30).default(1),
    summary: optionalText(2000),
  })
  .strict();

export const updateCharacterSchema = createCharacterSchema
  .extend({ level: z.coerce.number().int().min(1).max(30).optional() })
  .partial()
  .strict();
