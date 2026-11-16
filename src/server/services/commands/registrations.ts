import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { DomainError, notFound } from '../errors';
import { accessScope, eventScope } from '../scope';
import type { ScopeUser } from './owner';

// Sem 'server-only': os handlers do Pages API importam estes commands.

export type RegistrationCategory = 'CABECEIRO' | 'PEZEIRO';

/** Prova no escopo do usuário (senão "Prova não encontrada.", sem revelar existência). */
export async function findScopedEvent(user: ScopeUser, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScope(user) },
    select: { id: true, createdById: true, status: true, publishedAt: true },
  });
  if (!event) throw notFound('Prova');
  return event;
}

/**
 * Inscreve um atleta ativo que pertença ao dono da prova ou esteja compartilhado
 * com ele (spec 6.9). Reativa inscrição cancelada; inscrição ativa repetida = 409.
 */
export async function registerAthlete(user: ScopeUser, eventId: string, input: { athleteId: string; category: RegistrationCategory }) {
  const event = await findScopedEvent(user, eventId);
  const athlete = await prisma.athlete.findFirst({
    where: { id: input.athleteId, active: true, ...accessScope({ id: event.createdById, role: 'USER' }) },
    select: { id: true },
  });
  if (!athlete) throw new DomainError('Atleta não encontrado ou inativo.', { status: 404, field: 'athleteId' });

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_athleteId: { eventId, athleteId: athlete.id } },
  });
  if (existing?.status === 'ACTIVE') throw new DomainError('Este atleta já está inscrito nesta prova.', { status: 409, field: 'athleteId' });

  try {
    return await (existing
    ? prisma.eventRegistration.update({
        where: { id: existing.id },
        data: { category: input.category, status: 'ACTIVE', cancelledAt: null, registeredAt: new Date() },
        include: { athlete: true },
      })
    : prisma.eventRegistration.create({
        data: { eventId, athleteId: athlete.id, category: input.category },
        include: { athlete: true },
      }));
  } catch (error) {
    // Dois cliques simultâneos na primeira inscrição: a unicidade (eventId, athleteId) vira 409.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DomainError('Este atleta já está inscrito nesta prova.', { status: 409, field: 'athleteId' });
    }
    throw error;
  }
}

export async function cancelRegistration(user: ScopeUser, eventId: string, registrationId: string): Promise<void> {
  await findScopedEvent(user, eventId);
  const registration = await prisma.eventRegistration.findFirst({
    where: { id: registrationId, eventId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!registration) throw new DomainError('Inscrição ativa não encontrada.', { status: 404 });
  await prisma.eventRegistration.update({ where: { id: registration.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
}
