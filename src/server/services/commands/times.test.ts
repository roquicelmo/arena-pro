import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    event: { findUnique: vi.fn() },
    draw: { findFirst: vi.fn() },
    runTime: { deleteMany: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
    run: { update: vi.fn() },
  };
  return { tx, prisma: { run: { findFirst: vi.fn() }, $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } };
});
vi.mock('../../prisma', () => ({ prisma }));

import { recordTime } from './times';

const user = { id: 'u1', role: 'USER' };
const run = { id: 'r1', numberOfBulls: 2, drawId: 'd2', draw: { eventId: 'e1' } };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.run.findFirst.mockResolvedValue(run);
  tx.event.findUnique.mockResolvedValue({ status: 'DRAWN', publishedAt: null });
  tx.draw.findFirst.mockResolvedValue({ id: 'd2' });
  tx.runTime.findMany.mockResolvedValue([{ bullNumber: 1, timeSeconds: '8.12', isNt: false }]);
  tx.run.update.mockResolvedValue({ id: 'r1' });
});

describe('recordTime', () => {
  it('User grava na própria prova: escopo pelo criador, trava e recálculo', async () => {
    await recordTime(user, 'r1', { bullNumber: 1, timeSeconds: 8.12, isNt: false });
    expect(prisma.run.findFirst.mock.calls[0][0].where).toEqual({ id: 'r1', draw: { event: { createdById: 'u1' } } });
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.run.update.mock.calls[0][0].data).toEqual({ totalTime: null, averageTime: null, isNt: false, status: 'IN_PROGRESS' });
  });

  it('corrida de prova alheia = 404 sem gravar', async () => {
    prisma.run.findFirst.mockResolvedValue(null);
    await expect(recordTime(user, 'r9', { bullNumber: 1, timeSeconds: 8, isNt: false })).rejects.toMatchObject({ status: 404, message: 'Corrida não encontrada.' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('prova publicada = 409', async () => {
    tx.event.findUnique.mockResolvedValue({ status: 'FINISHED', publishedAt: new Date() });
    await expect(recordTime(user, 'r1', { bullNumber: 1, timeSeconds: 8, isNt: false })).rejects.toMatchObject({ status: 409, message: 'Resultado publicado: os tempos não podem mais ser alterados.' });
    expect(tx.runTime.upsert).not.toHaveBeenCalled();
  });

  it('corrida de versão antiga = 409', async () => {
    tx.draw.findFirst.mockResolvedValue({ id: 'd3' });
    await expect(recordTime(user, 'r1', { bullNumber: 1, timeSeconds: 8, isNt: false })).rejects.toMatchObject({ status: 409, message: 'Esta corrida é de uma versão antiga do sorteio. Recarregue a página.' });
  });

  it('boi fora da corrida = 422; tempo vazio apaga', async () => {
    await expect(recordTime(user, 'r1', { bullNumber: 3, timeSeconds: 8, isNt: false })).rejects.toMatchObject({ status: 422 });
    await recordTime(user, 'r1', { bullNumber: 1, timeSeconds: null, isNt: false });
    expect(tx.runTime.deleteMany).toHaveBeenCalledWith({ where: { runId: 'r1', bullNumber: 1 } });
  });
});
