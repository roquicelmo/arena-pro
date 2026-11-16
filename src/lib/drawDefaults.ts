import type { DrawConfig } from '../types/roping';

/** Configuração padrão do sorteio da prova (A, B e C, uma bateria por cruzamento). */
export const DEFAULT_DRAW_CONFIG: DrawConfig = {
  numGroups: 3,
  minGap: 5,
  balanceGroups: false,
  batteryMode: 'phases',
  numBatteries: 9,
};
