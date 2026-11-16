import { z } from 'zod';

/** Configuração do sorteio (mesmas regras aceitas pela API desde a fase 1). */
export const drawConfigSchema = z.object({
  numGroups: z.number().int().min(2, 'Use de 2 a 8 grupos.').max(8, 'Use de 2 a 8 grupos.'),
  minGap: z.number().int().min(0).max(100),
  balanceGroups: z.boolean(),
  batteryMode: z.enum(['phases', 'major3', 'single', 'custom']).optional(),
  numBatteries: z.number().int().min(1).max(32).optional(),
});

export const registrationSchema = z.object({
  athleteId: z.string().trim().min(1, 'Escolha um atleta.'),
  category: z.enum(['CABECEIRO', 'PEZEIRO']),
});

export const quickDrawSchema = z.object({
  cabeceiroIds: z.array(z.string().min(1)).min(1, 'Escolha ao menos um cabeceiro.').max(500),
  pezeiroIds: z.array(z.string().min(1)).min(1, 'Escolha ao menos um pezeiro.').max(500),
  config: drawConfigSchema,
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type QuickDrawInput = z.infer<typeof quickDrawSchema>;

/** Corpo do PDF do sorteio avulso: cabeçalho + corridas já sorteadas (sem re-sortear). */
export const quickSumulaSchema = z.object({
  title: z.string().trim().min(2, 'Informe o título do sorteio.').max(120),
  date: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')]).optional(),
  place: z.string().trim().max(120).optional(),
  runs: z.array(z.object({
    numero: z.number().int().min(1),
    bateria: z.number().int().min(1),
    cabeceiroId: z.string().min(1),
    pezeiroId: z.string().min(1),
    cabeceiroGrupo: z.string().max(4),
    pezeiroGrupo: z.string().max(4),
  })).min(1).max(2000),
});

export type QuickSumulaInput = z.infer<typeof quickSumulaSchema>;
