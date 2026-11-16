import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    event: { findUnique: vi.fn(), update: vi.fn() },
    draw: { findFirst: vi.fn(), update: vi.fn() },
  };
  return { tx, prisma: { event: { findFirst: vi.fn() }, $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } };
});
vi.mock('../../prisma', () => ({ prisma }));

import { publishResults } from './results';

const user = { id: 'u1', role: 'USER' };
beforeEach(() => {
  vi.clearAllMocks();
  prisma.event.findFirst.mockResolvedValue({ id: 'e1', createdById: 'u1', status: 'IN_PROGRESS', publishedAt: null });
  tx.event.findUnique.mockResolvedValue({ status: 'IN_PROGRESS', publishedAt: null });
});

describe('publishResults', () => {
  it('User B não publica a prova do A (404)', async () => {
    prisma.event.findFirst.mockResolvedValue(null);
    await expect(publishResults({ id: 'uB', role: 'USER' }, 'e1')).rejects.toMatchObject({ status: 404 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('corrida incompleta bloqueia (422)', async () => {
    tx.draw.findFirst.mockResolvedValue({ id: 'd1', runs: [{ status: 'COMPLETED' }, { status: 'IN_PROGRESS' }] });
    await expect(publishResults(user, 'e1')).rejects.toMatchObject({ status: 422, message: 'Finalize ou marque como NT todas as corridas antes de publicar.' });
    expect(tx.draw.update).not.toHaveBeenCalled();
  });

  it('prova já publicada = 409', async () => {
    tx.event.findUnique.mockResolvedValue({ status: 'FINISHED', publishedAt: new Date() });
    await expect(publishResults(user, 'e1')).rejects.toMatchObject({ status: 409 });
  });

  it('trava a linha da prova e publica draw e prova com publishedAt', async () => {
    tx.draw.findFirst.mockResolvedValue({ id: 'd1', runs: [{ status: 'COMPLETED' }, { status: 'ELIMINATED' }] });
    await publishResults(user, 'e1');
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.event.update.mock.calls[0][0].data).toMatchObject({ status: 'FINISHED', publishedAt: expect.any(Date) });
    expect(tx.draw.update.mock.calls[0][0].data).toMatchObject({ status: 'PUBLISHED', publishedAt: expect.any(Date) });
  });
});
