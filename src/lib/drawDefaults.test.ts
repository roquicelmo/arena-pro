import { describe, expect, it } from 'vitest';
import { DEFAULT_DRAW_CONFIG, parseDrawConfig } from './drawDefaults';

describe('parseDrawConfig', () => {
  it('usa o padrão quando não há configuração persistida', () => {
    expect(parseDrawConfig(null)).toEqual(DEFAULT_DRAW_CONFIG);
    expect(parseDrawConfig(undefined)).toEqual(DEFAULT_DRAW_CONFIG);
    expect(parseDrawConfig('lixo')).toEqual(DEFAULT_DRAW_CONFIG);
  });

  it('mantém os campos válidos da configuração persistida', () => {
    expect(parseDrawConfig({ numGroups: 2, minGap: 8, balanceGroups: true, batteryMode: 'single', numBatteries: 1 }))
      .toEqual({ numGroups: 2, minGap: 8, balanceGroups: true, batteryMode: 'single', numBatteries: 1 });
  });

  it('completa campos ausentes e descarta inválidos com o padrão', () => {
    expect(parseDrawConfig({ minGap: 3, numGroups: 99, batteryMode: 'outro', extra: 1 }))
      .toEqual({ ...DEFAULT_DRAW_CONFIG, minGap: 3 });
  });
});
