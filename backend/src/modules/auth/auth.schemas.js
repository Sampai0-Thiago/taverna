import { z } from 'zod';
import { hexColor } from '../users/users.schemas.js';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome muito curto').max(60),
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(254),
    password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(128),
    color: hexColor.optional(),
    inviteCode: z.string().trim().max(100).optional(),
    // LGPD: ciência da Política de Privacidade é exigida no cadastro (registrada com data e versão)
    acceptPrivacy: z.literal(true, { message: 'É preciso aceitar a Política de Privacidade' }),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(254),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(254),
    code: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos'),
    newPassword: z.string().min(8, 'A nova senha precisa de pelo menos 8 caracteres').max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('E-mail inválido'),
    password: z.string().min(1, 'Informe a senha'),
  })
  .strict();
