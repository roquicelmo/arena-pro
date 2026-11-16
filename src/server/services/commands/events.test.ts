import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx, findMunicipality } = vi.hoisted(() => {
  const tx = {
    user: { findFirst: vi.fn() },
    arena: { findFirst: vi.fn(), create: vi.fn() },
    event: { create: vi.fn() },
  };
  return {
    tx,
    prisma: {
      user: { findFirst: vi.fn() },
      event: { findFirst: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(),
    },
    findMunicipality: vi.fn(),
  };
});
vi.mock('../../prisma', () => ({ prisma }));
vi.mock('../localities', () => ({ findMunicipality }));

import { cancelEvent, createEvent } from './events';

const user = { id: 'u1', role: 'USER' };
const eventDate = new Date('2026-12-01T12:00:00.000Z');

beforeEach(() => {
  vi.resetAllMocks();
  prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));
  tx.event.create.mockResolvedValue({ id: 'e1' });
});

describe('createEvent', () => {
  it('prova com arena nova cria a arena com o mesmo dono dentro da transação', async () => {
    tx.arena.findFirst.mockResolvedValue(null);
    tx.arena.create.mockResolvedValue({ id: 'ar1' });
    await createEvent(user, { name: 'Prova', eventDate, newArena: { name: 'Arena', city: 'Caiapônia', state: 'GO' }, ownerId: 'u2' });
    expect(tx.arena.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: 'u1', name: 'Arena' }) });
    expect(tx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT', createdById: 'u1', arenaId: 'ar1' }) }),
    );
  });

  it('com arenaId usa arena do escopo de acesso (compartilhada vale)', async () => {
    tx.arena.findFirst.mockResolvedValue({ id: 'ar9' });
    await createEvent(user, { name: 'Prova', eventDate, arenaId: 'ar9' });
    expect(tx.arena.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ar9', active: true, OR: [{ ownerId: 'u1' }, { shares: { some: { userId: 'u1' } } }] },
      }),
    );
    expect(tx.event.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ arenaId: 'ar9' }) }));
  });

  it('user não usa arena de outro', async () => {
    tx.arena.findFirst.mockResolvedValue(null);
    await expect(createEvent(user, { name: 'Prova', eventDate, arenaId: 'x' })).rejects.toMatchObject({
      status: 404,
      field: 'arenaId',
      message: 'Arena não encontrada ou inativa.',
    });
    expect(tx.event.create).not.toHaveBeenCalled();
  });
});

describe('cancelEvent', () => {
  it('user não cancela prova de outro (404)', async () => {
    prisma.event.findFirst.mockResolvedValue(null);
    await expect(cancelEvent(user, 'e9')).rejects.toMatchObject({ status: 404, message: 'Prova não encontrada.' });
    expect(prisma.event.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'e9', createdById: 'u1' } }));
  });

  it('cancelar prova já cancelada não chama update', async () => {
    prisma.event.findFirst.mockResolvedValue({ id: 'e1', status: 'CANCELLED' });
    await cancelEvent(user, 'e1');
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('cancela prova ativa', async () => {
    prisma.event.findFirst.mockResolvedValue({ id: 'e1', status: 'DRAFT' });
    await cancelEvent(user, 'e1');
    expect(prisma.event.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { status: 'CANCELLED' } });
  });
});
