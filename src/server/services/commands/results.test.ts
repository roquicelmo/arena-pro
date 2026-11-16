import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    event: { findFirst: vi.fn(), update: vi.fn() },
    draw: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));
vi.mock('../../prisma', () => ({ prisma }));

import { publishResults } from './results';

const user = { id: 'u1', role: 'USER' };
beforeEach(() => {
  vi.clearAllMocks();
  prisma.event.findFirst.mockResolvedValue({ id: 'e1', createdById: 'u1', status: 'IN_PROGRESS', publishedAt: null });
});

describe('publishResults', () => {
  it('User B não publica a prova do A (404)', async () => {
    prisma.event.findFirst.mockResolvedValue(null);
    await expect(publishResults({ id: 'uB', role: 'USER' }, 'e1')).rejects.toMatchObject({ status: 404 });
    expect(prisma.draw.update).not.toHaveBeenCalled();
  });

  it('corrida incompleta bloqueia (422)', async () => {
    prisma.draw.findFirst.mockResolvedValue({ id: 'd1', runs: [{ status: 'COMPLETED' }, { status: 'IN_PROGRESS' }] });
    await expect(publishResults(user, 'e1')).rejects.toMatchObject({ status: 422, message: 'Finalize ou marque como NT todas as corridas antes de publicar.' });
  });

  it('publica draw e prova com publishedAt na mesma transação', async () => {
    prisma.draw.findFirst.mockResolvedValue({ id: 'd1', runs: [{ status: 'COMPLETED' }, { status: 'ELIMINATED' }] });
    await publishResults(user, 'e1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.event.update.mock.calls[0][0].data).toMatchObject({ status: 'FINISHED', publishedAt: expect.any(Date) });
    expect(prisma.draw.update.mock.calls[0][0].data).toMatchObject({ status: 'PUBLISHED', publishedAt: expect.any(Date) });
  });
});
