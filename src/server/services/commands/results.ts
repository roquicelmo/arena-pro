import { prisma } from '../../prisma';
import { DomainError } from '../errors';
import type { ScopeUser } from './owner';
import { findScopedEvent } from './registrations';

// Sem 'server-only': o handler do Pages API importa este command.

export const PUBLISH_MESSAGES = {
  empty: 'Não há corridas para publicar.',
  incomplete: 'Finalize ou marque como NT todas as corridas antes de publicar.',
} as const;

/** Publica o resultado da versão vigente; só na prova do escopo do usuário (spec 6.4). */
export async function publishResults(user: ScopeUser, eventId: string) {
  await findScopedEvent(user, eventId);
  const draw = await prisma.draw.findFirst({
    where: { eventId },
    orderBy: { version: 'desc' },
    include: { runs: { select: { status: true } } },
  });
  if (!draw || !draw.runs.length) throw new DomainError(PUBLISH_MESSAGES.empty, { status: 422 });
  if (draw.runs.some((run) => run.status === 'PENDING' || run.status === 'IN_PROGRESS')) {
    throw new DomainError(PUBLISH_MESSAGES.incomplete, { status: 422 });
  }
  const now = new Date();
  const [published] = await prisma.$transaction([
    prisma.draw.update({ where: { id: draw.id }, data: { status: 'PUBLISHED', publishedAt: now } }),
    prisma.event.update({ where: { id: eventId }, data: { status: 'FINISHED', publishedAt: now } }),
  ]);
  return published;
}
