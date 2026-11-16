import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    accessRequest: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));
vi.mock('../../prisma', () => ({ prisma }));
vi.mock('bcryptjs', () => ({ hash: vi.fn(async () => 'hash') }));

import { reviewAccessRequest } from './accessRequests';
import { createUser, deactivateUser, setUserActive, updateUser } from './users';

const admin = { id: 'a1', role: 'ADMIN' };
const manager = { id: 'm1', role: 'MANAGER' };
const data = { name: 'Novo', email: 'novo@x.test', password: 'senha-123', role: 'USER' as const, provisional: false };

beforeEach(() => vi.clearAllMocks());

describe('users commands', () => {
  it('Manager não cria nem edita usuário (403)', async () => {
    await expect(createUser(manager, data)).rejects.toMatchObject({ status: 403, message: 'Somente administradores podem criar usuários.' });
    await expect(updateUser(manager, 'u1', data)).rejects.toMatchObject({ status: 403 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('User não gerencia usuários', async () => {
    await expect(setUserActive({ id: 'u1', role: 'USER' }, 'u2', true)).rejects.toMatchObject({ status: 403 });
  });

  it('Manager ativa provisório, mas não usuário comum', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'p1', provisional: true });
    await setUserActive(manager, 'p1', true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1' }, data: { active: true } }));
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'c1', provisional: false });
    await expect(setUserActive(manager, 'c1', true)).rejects.toMatchObject({ status: 403, message: 'Managers só podem habilitar usuários provisórios.' });
  });

  it('Admin não exclui a si mesmo; e-mail duplicado = 409', async () => {
    await expect(deactivateUser(admin, 'a1')).rejects.toMatchObject({ status: 422 });
    prisma.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(createUser(admin, data)).rejects.toMatchObject({ status: 409, field: 'email' });
  });
});

describe('reviewAccessRequest', () => {
  it('aprovar cria USER provisório e inativo na mesma transação', async () => {
    prisma.accessRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'PENDING', name: 'Zé', email: 'ze@x.test' });
    prisma.user.findUnique.mockResolvedValue(null);
    await reviewAccessRequest(manager, 'r1', { decision: 'APPROVED', password: 'senha-123' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({ role: 'USER', provisional: true, active: false, managedById: 'm1' });
  });

  it('e-mail já cadastrado = 409; não pendente = 404; senha curta = 400', async () => {
    prisma.accessRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'PENDING', name: 'Zé', email: 'ze@x.test' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u9' });
    await expect(reviewAccessRequest(manager, 'r1', { decision: 'APPROVED', password: 'senha-123' })).rejects.toMatchObject({ status: 409 });
    await expect(reviewAccessRequest(manager, 'r1', { decision: 'APPROVED', password: '123' })).rejects.toMatchObject({ status: 400 });
    prisma.accessRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'APPROVED' });
    await expect(reviewAccessRequest(manager, 'r1', { decision: 'REJECTED' })).rejects.toMatchObject({ status: 404 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
