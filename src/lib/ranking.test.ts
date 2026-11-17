import { describe, expect, it } from 'vitest';
import type { Run } from '../types/roping';
import { rankRuns } from './ranking';

const run = (numero: number, over: Partial<Run> = {}) => ({ id: String(numero), numero, isNt: false, mediaFinal: null, totalTime: null, ...over }) as Run;

describe('rankRuns', () => {
  it('ordena por menor média e separa NT e incompletas por número', () => {
    const { ranked, eliminated, pending } = rankRuns([run(4, { mediaFinal: 9 }), run(2, { isNt: true }), run(3), run(1, { mediaFinal: 8.5 }), run(5, { mediaFinal: 9 })]);
    expect(ranked.map((r) => r.numero)).toEqual([1, 4, 5]);
    expect(eliminated.map((r) => r.numero)).toEqual([2]);
    expect(pending.map((r) => r.numero)).toEqual([3]);
  });
});
