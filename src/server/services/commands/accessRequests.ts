import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { prisma } from '../../prisma';
import { canManageUsers } from '../../permissions';
import { DomainError } from '../errors';
import type { ScopeUser } from './owner';
import { USER_MESSAGES } from './users';

export const ACCESS_MESSAGES = {
  forbidden: 'Apenas Admin e Manager podem revisar solicitações.',
  notFound: 'Solicitação pendente não encontrada.',
  password: 'Informe uma senha inicial com pelo menos 8 caracteres.',
} as const;

/** Aprovar cria USER provisório e inativo (na mesma transação da revisão); recusar só marca. */
export async function reviewAccessRequest(actor: ScopeUser, id: string, input: { decision: 'APPROVED' | 'REJECTED'; password?: string }) {
  if (!canManageUsers(actor.role)) throw new DomainError(ACCESS_MESSAGES.forbidden, { status: 403 });
  const request = await prisma.accessRequest.findUnique({ where: { id } });
  if (!request || request.status !== 'PENDING') throw new DomainError(ACCESS_MESSAGES.notFound, { status: 404 });
  const reviewed = { status: input.decision, reviewedById: actor.id, reviewedAt: new Date() };
  if (input.decision === 'REJECTED') {
    await prisma.accessRequest.update({ where: { id }, data: reviewed });
    return;
  }
  if (!input.password || input.password.length < 8) throw new DomainError(ACCESS_MESSAGES.password, { status: 400, field: 'password' });
  if (await prisma.user.findUnique({ where: { email: request.email }, select: { id: true } })) {
    throw new DomainError(USER_MESSAGES.duplicate, { status: 409 });
  }
  try {
    await prisma.$transaction([
    prisma.user.create({
      data: { name: request.name, email: request.email, passwordHash: await hash(input.password, 12), role: 'USER', provisional: true, active: false, managedById: actor.id },
    }),
    prisma.accessRequest.update({ where: { id }, data: reviewed }),
  ]);
  } catch (error) {
    // Duas aprovações simultâneas (ou e-mail criado no meio): a unicidade do e-mail vira 409.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DomainError(USER_MESSAGES.duplicate, { status: 409 });
    }
    throw error;
  }
}

export const listPendingAccessRequests = () =>
  prisma.accessRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, phone: true, email: true, createdAt: true },
  });
