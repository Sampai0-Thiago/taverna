import { z } from 'zod';

export { uuidParam } from '../../utils/validators.js';
export const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB');

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    color: hexColor.optional(),
  })
  .strict();

export const preferencesSchema = z.object({ diceEnabled: z.boolean() }).strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'A nova senha precisa de pelo menos 8 caracteres').max(128),
  })
  .strict();

export const activateMasterSchema = z.object({ token: z.string().min(1, 'Informe o token').max(200) }).strict();
