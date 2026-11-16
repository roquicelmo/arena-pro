import { z } from 'zod';

export type RecordType = 'athlete' | 'arena';

export const shareSchema = z.object({
  type: z.enum(['athlete', 'arena']),
  ids: z.array(z.string().min(1)).min(1, 'Selecione ao menos um cadastro.'),
  userIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um usuário.'),
});

export const reassignSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Selecione ao menos uma prova.'),
  ownerId: z.string({ error: 'Selecione o responsável.' }).min(1, 'Selecione o responsável.'),
});

export type ShareInput = z.input<typeof shareSchema>;
export type ReassignInput = z.input<typeof reassignSchema>;
