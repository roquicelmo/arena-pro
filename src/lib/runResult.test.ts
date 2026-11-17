import { describe, expect, it } from 'vitest';
import { computeRunResult } from './runResult';

const t = (bullNumber: number, timeSeconds: number | null, isNt = false) => ({ bullNumber, timeSeconds, isNt });

describe('computeRunResult', () => {
  it('NT elimina sem total', () => {
    expect(computeRunResult(2, [t(1, 8.1), t(2, null, true)])).toEqual({ totalTime: null, averageTime: null, isNt: true, status: 'ELIMINATED' });
  });
  it('todos os bois com tempo completam com média', () => {
    expect(computeRunResult(2, [t(1, 8.12), t(2, 9.02)])).toEqual({ totalTime: 17.14, averageTime: 8.57, isNt: false, status: 'COMPLETED' });
  });
  it('parcial fica em andamento; vazio fica pendente', () => {
    expect(computeRunResult(3, [t(1, 8)]).status).toBe('IN_PROGRESS');
    expect(computeRunResult(1, []).status).toBe('PENDING');
  });
});
