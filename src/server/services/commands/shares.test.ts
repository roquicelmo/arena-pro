import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findMany: vi.fn() },
    athlete: { findMany: vi.fn() },
    arena: { findMany: vi.fn() },
    event: { findMany: vi.fn(), updateMany: vi.fn() },
    athleteShare: { createMany: vi.fn(), deleteMany: vi.fn() },
    arenaShare: { createMany: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock('../../prisma', () => ({ prisma }));

import { reassignEvents, shareRecords, unshareRecords } from './shares';

const manager = { id: 'm1', role: 'MANAGER' };
const user = { id: 'u1', role: 'USER' };

beforeEach(() => {
  vi.resetAllMocks();
  prisma.athlete.findMany.mockResolvedValue([{ id: 'a1', ownerId: 'u2' }]);
  prisma.user.findMany.mockResolvedValue([{ id: 'u2' }, { id: 'u3' }]);
  prisma.athleteShare.createMany.mockResolvedValue({ count: 1 });
  prisma.athleteShare.deleteMany.mockResolvedValue({ count: 1 });
});

describe('shareRecords', () => {
  it('user não compartilha (403) e nada é gravado', async () => {
    await expect(shareRecords(user, { type: 'athlete', ids: ['a1'], userIds: ['u3'] })).rejects.toMatchObject({
      status: 403,
      message: 'Você não tem permissão para esta ação.',
    });
    expect(prisma.athleteShare.createMany).not.toHaveBeenCalled();
    expect(prisma.athlete.findMany).not.toHaveBeenCalled();
  });

  it('compartilhar ignora o dono e usa skipDuplicates', async () => {
    const result = await shareRecords(manager, { type: 'athlete', ids: ['a1'], userIds: ['u2', 'u3'] });
    expect(prisma.athleteShare.createMany).toHaveBeenCalledWith({
      data: [{ athleteId: 'a1', userId: 'u3' }],
      skipDuplicates: true,
    });
    expect(result).toEqual({ added: 1 });
  });

  it('compartilha arenas na tabela de arenas', async () => {
    prisma.arena.findMany.mockResolvedValue([{ id: 'r1', ownerId: null }]);
    prisma.arenaShare.createMany.mockResolvedValue({ count: 2 });
    expect(await shareRecords(manager, { type: 'arena', ids: ['r1'], userIds: ['u2', 'u3'] })).toEqual({ added: 2 });
    expect(prisma.arenaShare.createMany).toHaveBeenCalledWith({
      data: [{ arenaId: 'r1', userId: 'u2' }, { arenaId: 'r1', userId: 'u3' }],
      skipDuplicates: true,
    });
  });

  it('id inexistente → 404', async () => {
    await expect(shareRecords(manager, { type: 'athlete', ids: ['a1', 'a9'], userIds: ['u3'] })).rejects.toMatchObject({
      status: 404,
      message: 'Algum cadastro selecionado não existe mais. Recarregue a página.',
    });
    expect(prisma.athleteShare.createMany).not.toHaveBeenCalled();
  });

  it('usuário de destino inativo → erro no campo userIds', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u2' }]);
    await expect(shareRecords(manager, { type: 'athlete', ids: ['a1'], userIds: ['u2', 'u3'] })).rejects.toMatchObject({
      message: 'Usuário inválido.',
      field: 'userIds',
    });
    expect(prisma.athleteShare.createMany).not.toHaveBeenCalled();
  });

  it('só considera usuários ativos com papel de operador', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u3' }]);
    await shareRecords(manager, { type: 'athlete', ids: ['a1'], userIds: ['u3'] });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['u3'] }, active: true, role: { in: ['ADMIN', 'MANAGER', 'ORGANIZER', 'USER'] } } }),
    );
  });
});

describe('unshareRecords', () => {
  it('user não remove (403)', async () => {
    await expect(unshareRecords(user, { type: 'athlete', ids: ['a1'], userIds: ['u3'] })).rejects.toMatchObject({ status: 403 });
    expect(prisma.athleteShare.deleteMany).not.toHaveBeenCalled();
  });

  it('remove os vínculos pedidos', async () => {
    expect(await unshareRecords(manager, { type: 'athlete', ids: ['a1'], userIds: ['u3'] })).toEqual({ removed: 1 });
    expect(prisma.athleteShare.deleteMany).toHaveBeenCalledWith({ where: { athleteId: { in: ['a1'] }, userId: { in: ['u3'] } } });
  });
});

describe('reassignEvents', () => {
  beforeEach(() => {
    prisma.event.findMany.mockResolvedValue([{ id: 'e1' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u2' }]);
    prisma.event.updateMany.mockResolvedValue({ count: 1 });
  });

  it('troca createdById das provas', async () => {
    expect(await reassignEvents(manager, { ids: ['e1'], ownerId: 'u2' })).toEqual({ updated: 1 });
    expect(prisma.event.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['e1'] } }, data: { createdById: 'u2' } });
  });

  it('recusa prova cancelada (ela não entra na busca) com 404', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    await expect(reassignEvents(manager, { ids: ['e1'], ownerId: 'u2' })).rejects.toMatchObject({ status: 404 });
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['e1'] }, status: { not: 'CANCELLED' } } }),
    );
    expect(prisma.event.updateMany).not.toHaveBeenCalled();
  });

  it('responsável inválido → erro no campo ownerId', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await expect(reassignEvents(manager, { ids: ['e1'], ownerId: 'x' })).rejects.toMatchObject({ message: 'Usuário inválido.', field: 'ownerId' });
  });

  it('user não troca responsável (403)', async () => {
    await expect(reassignEvents(user, { ids: ['e1'], ownerId: 'u2' })).rejects.toMatchObject({ status: 403 });
  });
});
