import { z } from 'zod';

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const role = z.enum(['ADMIN', 'MANAGER', 'USER']);
const expires = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.').optional());

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome (mínimo 2 letras).').max(120),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(128),
  role,
  provisional: z.boolean().default(false),
  accessExpiresAt: expires,
});

export const updateUserSchema = createUserSchema.extend({
  password: z.preprocess(blank, z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(128).optional()),
});

export const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  password: z.preprocess(blank, z.string().optional()),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type ReviewInput = z.input<typeof reviewSchema>;
