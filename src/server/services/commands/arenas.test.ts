import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, findMunicipality } = vi.hoisted(() => ({
  prisma: {
    user: { findFirst: vi.fn() },
    arena: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
  },
  findMunicipality: vi.fn(),
}));
vi.mock('../../prisma', () => ({ prisma }));
vi.mock('../localities', () => ({ findMunicipality }));

import { createArena, deactivateArena, updateArena } from './arenas';

const user = { id: 'u1', role: 'USER' };

beforeEach(() => {
  vi.resetAllMocks();
  prisma.arena.create.mockResolvedValue({ id: 'n1' });
  prisma.arena.update.mockResolvedValue({ id: 'r1' });
});

describe('createArena', () => {
  it('arena duplicada do mesmo dono é reaproveitada', async () => {
    prisma.arena.findFirst.mockResolvedValue({ id: 'r1' });
    const result = await createArena(user, { name: 'Arena Lagoa', city: 'Caiapônia', state: 'GO' });
    expect(result).toEqual({ arena: { id: 'r1' }, created: false });
    expect(prisma.arena.create).not.toHaveBeenCalled();
    expect(prisma.arena.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        active: true,
        ownerId: 'u1',
        name: { equals: 'Arena Lagoa', mode: 'insensitive' },
        city: { equals: 'Caiapônia', mode: 'insensitive' },
        state: 'GO',
      }),
    });
  });

  it('cria quando não existe e grava o município', async () => {
    prisma.arena.findFirst.mockResolvedValue(null);
    findMunicipality.mockResolvedValue({ code: 7, name: 'Cidade Mock', uf: 'ZZ' });
    const result = await createArena(user, { name: 'Nova', cityCode: 7 });
    expect(result.created).toBe(true);
    expect(prisma.arena.create).toHaveBeenCalledWith({
      data: { name: 'Nova', cityCode: 7, city: 'Cidade Mock', state: 'ZZ', ownerId: 'u1' },
    });
  });

  it('usa o client da transação quando recebe um', async () => {
    const tx = { user: { findFirst: vi.fn() }, arena: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'n2' }) } };
    await createArena(user, { name: 'Nova', city: 'X', state: 'GO' }, tx as never);
    expect(tx.arena.create).toHaveBeenCalled();
    expect(prisma.arena.create).not.toHaveBeenCalled();
  });
});

describe('updateArena', () => {
  it('renomear para nome de outra arena ativa → DomainError 409 no campo name', async () => {
    prisma.arena.findFirst
      .mockResolvedValueOnce({ id: 'r1', ownerId: 'u1', name: 'A', city: 'Caiapônia', state: 'GO', cityCode: null })
      .mockResolvedValueOnce({ id: 'r2' });
    await expect(updateArena(user, 'r1', { name: 'B' })).rejects.toMatchObject({
      status: 409,
      field: 'name',
      message: 'Já existe uma arena com esse nome nessa cidade.',
    });
    expect(prisma.arena.update).not.toHaveBeenCalled();
  });

  it('só dono ou gerente edita (403 para compartilhado)', async () => {
    prisma.arena.findFirst.mockResolvedValue({ id: 'r1', ownerId: 'u2', name: 'A', city: 'C', state: 'GO', cityCode: null });
    await expect(updateArena(user, 'r1', { name: 'B' })).rejects.toMatchObject({ status: 403 });
    await expect(deactivateArena(user, 'r1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('deactivateArena', () => {
  it('user não desativa arena de outro (404)', async () => {
    prisma.arena.findFirst.mockResolvedValue(null);
    await expect(deactivateArena(user, 'r9')).rejects.toMatchObject({ status: 404, message: 'Arena não encontrada.' });
    expect(prisma.arena.update).not.toHaveBeenCalled();
  });

  it('marca active=false', async () => {
    prisma.arena.findFirst.mockResolvedValue({ id: 'r1', ownerId: 'u1' });
    await deactivateArena(user, 'r1');
    expect(prisma.arena.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { active: false } });
  });
});
