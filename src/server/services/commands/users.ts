import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { prisma } from '../../prisma';
import { canEditUsers, canManageUsers } from '../../permissions';
import { DomainError } from '../errors';
import type { ScopeUser } from './owner';

// Sem 'server-only': padrão dos commands (handlers do Pages API).

export const USER_MESSAGES = {
  forbidden: 'Você não tem permissão para gerenciar usuários.',
  adminOnlyCreate: 'Somente administradores podem criar usuários.',
  adminOnlyEdit: 'Somente administradores podem editar usuários.',
  adminOnlyDelete: 'Somente administradores podem excluir usuários.',
  managerProvisional: 'Managers só podem habilitar usuários provisórios.',
  self: 'Não é possível excluir o próprio usuário.',
  duplicate: 'Já existe um usuário com este e-mail.',
  notFound: 'Usuário não encontrado.',
} as const;

export const userSelect = { id: true, name: true, email: true, role: true, active: true, provisional: true, accessExpiresAt: true, lastLoginAt: true, createdAt: true, managedById: true } as const;

type Role = 'ADMIN' | 'MANAGER' | 'USER';
interface UserData { name: string; email: string; password?: string; role: Role; provisional: boolean; accessExpiresAt?: string }

const expiresAt = (date?: string) => (date ? new Date(`${date}T23:59:59.000Z`) : null);
const assertManager = (actor: ScopeUser) => {
  if (!canManageUsers(actor.role)) throw new DomainError(USER_MESSAGES.forbidden, { status: 403 });
};
const duplicate = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export async function createUser(actor: ScopeUser, data: UserData & { password: string }) {
  assertManager(actor);
  if (!canEditUsers(actor.role)) throw new DomainError(USER_MESSAGES.adminOnlyCreate, { status: 403 });
  try {
    return await prisma.user.create({
      data: {
        name: data.name, email: data.email, passwordHash: await hash(data.password, 12), role: data.role,
        provisional: data.provisional, accessExpiresAt: expiresAt(data.accessExpiresAt), managedById: actor.id,
      },
      select: userSelect,
    });
  } catch (error) {
    if (duplicate(error)) throw new DomainError(USER_MESSAGES.duplicate, { status: 409, field: 'email' });
    throw error;
  }
}

export async function updateUser(actor: ScopeUser, id: string, data: UserData) {
  assertManager(actor);
  if (!canEditUsers(actor.role)) throw new DomainError(USER_MESSAGES.adminOnlyEdit, { status: 403 });
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw new DomainError(USER_MESSAGES.notFound, { status: 404 });
  try {
    return await prisma.user.update({
      where: { id },
      data: {
        name: data.name, email: data.email, role: data.role, provisional: data.provisional, accessExpiresAt: expiresAt(data.accessExpiresAt),
        ...(data.password ? { passwordHash: await hash(data.password, 12) } : {}),
      },
      select: userSelect,
    });
  } catch (error) {
    if (duplicate(error)) throw new DomainError(USER_MESSAGES.duplicate, { status: 409, field: 'email' });
    throw error;
  }
}

/** Ativar/desativar: Admin em qualquer usuário (menos a si mesmo ao desativar); Manager só provisórios. */
export async function setUserActive(actor: ScopeUser, id: string, active: boolean) {
  assertManager(actor);
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, provisional: true } });
  if (!target) throw new DomainError(USER_MESSAGES.notFound, { status: 404 });
  if (!canEditUsers(actor.role) && !target.provisional) throw new DomainError(USER_MESSAGES.managerProvisional, { status: 403 });
  if (!active && id === actor.id) throw new DomainError(USER_MESSAGES.self, { status: 422 });
  return prisma.user.update({ where: { id }, data: { active }, select: userSelect });
}

/** "Excluir" = desativar (exclusão lógica), só Admin. */
export async function deactivateUser(actor: ScopeUser, id: string) {
  assertManager(actor);
  if (!canEditUsers(actor.role)) throw new DomainError(USER_MESSAGES.adminOnlyDelete, { status: 403 });
  if (id === actor.id) throw new DomainError(USER_MESSAGES.self, { status: 422 });
  return setUserActive(actor, id, false);
}
