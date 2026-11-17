import { z } from 'zod';
import type { DrawConfig } from '../types/roping';

/** Configuração padrão do sorteio da prova (A, B e C, uma bateria por cruzamento). */
export const DEFAULT_DRAW_CONFIG: DrawConfig = {
  numGroups: 3,
  minGap: 5,
  balanceGroups: false,
  batteryMode: 'phases',
  numBatteries: 9,
};

// Mesmos limites do drawConfigSchema (src/lib/schemas/draws.ts).
const FIELDS = {
  numGroups: z.number().int().min(2).max(8),
  minGap: z.number().int().min(0).max(100),
  balanceGroups: z.boolean(),
  batteryMode: z.enum(['phases', 'major3', 'single', 'custom']),
  numBatteries: z.number().int().min(1).max(32),
} as const;

/**
 * Lê a `configuration` (JSON) persistida no sorteio: cada campo válido é mantido,
 * campos ausentes ou inválidos ficam com o valor padrão.
 */
export function parseDrawConfig(raw: unknown): DrawConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_DRAW_CONFIG };
  const source = raw as Record<string, unknown>;
  const config: Record<string, unknown> = { ...DEFAULT_DRAW_CONFIG };
  for (const [key, schema] of Object.entries(FIELDS)) {
    const parsed = schema.safeParse(source[key]);
    if (parsed.success) config[key] = parsed.data;
  }
  return config as unknown as DrawConfig;
}
