import { z } from 'zod';

/** Schemas reutilizáveis entre módulos. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Data inexistente');

export const uuidParam = z.object({ id: z.string().uuid('ID inválido') });

const MAX_RANGE_DAYS = 400;

export const dateRangeQuery = z
  .object({ from: isoDate, to: isoDate })
  .refine(({ from, to }) => from <= to, { message: '"from" deve ser anterior a "to"' })
  .refine(
    ({ from, to }) => (Date.parse(to) - Date.parse(from)) / 86_400_000 <= MAX_RANGE_DAYS,
    { message: `Intervalo máximo de ${MAX_RANGE_DAYS} dias` },
  );

/** Campos de formulário multipart chegam como string: "" vira undefined. */
export const optionalText = (max) =>
  z.preprocess((v) => (v === '' ? null : v), z.string().trim().max(max).nullable().optional());
