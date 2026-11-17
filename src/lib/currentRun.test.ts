import { describe, expect, it } from 'vitest';
import type { Run } from '../types/roping';
import { createSerialQueue } from './serialQueue';
import { currentRunId, trackStats } from './currentRun';

const run = (id: string, numero: number, over: Partial<Run> = {}) => ({ id, numero, totalTime: null, mediaFinal: null, isNt: false, ...over }) as Run;

describe('currentRun', () => {
  it('é a primeira sem total e sem NT, por número', () => {
    expect(currentRunId([run('c', 3), run('a', 1, { totalTime: 9, mediaFinal: 9 }), run('b', 2, { isNt: true })])).toBe('c');
    expect(currentRunId([run('a', 1, { totalTime: 9, mediaFinal: 9 })])).toBeNull();
  });
  it('estatísticas contam concluídas, NT, restantes e melhor média', () => {
    expect(trackStats([run('a', 1, { totalTime: 18, mediaFinal: 9 }), run('b', 2, { isNt: true }), run('c', 3), run('d', 4, { totalTime: 8.5, mediaFinal: 8.5 })]))
      .toEqual({ completed: 2, nt: 1, remaining: 1, best: 8.5 });
  });
});

describe('createSerialQueue', () => {
  it('executa as tarefas da mesma chave em série, na ordem', async () => {
    const enqueue = createSerialQueue();
    const order: string[] = [];
    const slow = (label: string, ms: number) => () => new Promise<void>((resolve) => setTimeout(() => { order.push(label); resolve(); }, ms));
    await Promise.all([enqueue('r1:1', slow('8', 30)), enqueue('r1:1', slow('8.1', 5)), enqueue('r1:1', slow('8.12', 1))]);
    expect(order).toEqual(['8', '8.1', '8.12']);
  });
  it('uma falha não trava a fila', async () => {
    const enqueue = createSerialQueue();
    await expect(enqueue('k', async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(enqueue('k', async () => 'ok')).resolves.toBe('ok');
  });
});
