import { prisma } from '../../prisma';
import { DomainError } from '../errors';
import type { ScopeUser } from './owner';
import { findScopedEvent } from './registrations';

// Sem 'server-only': o handler do Pages API importa este command.

export const PUBLISH_MESSAGES = {
  empty: 'Não há corridas para publicar.',
  incomplete: 'Finalize ou marque como NT todas as corridas antes de publicar.',
  already: 'O resultado desta prova já foi publicado.',
} as const;

/**
 * Publica o resultado da versão vigente; só na prova do escopo do usuário (spec 6.4).
 * Roda sob a mesma trava de linha do lançamento de tempos: nenhum tempo apagado
 * entre a checagem e a publicação deixa uma corrida incompleta publicada.
 */
export async function publishResults(user: ScopeUser, eventId: string) {
  await findScopedEvent(user, eventId);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { status: true, publishedAt: true } });
    if (event?.status === 'FINISHED' || event?.publishedAt) throw new DomainError(PUBLISH_MESSAGES.already, { status: 409 });
    const draw = await tx.draw.findFirst({
      where: { eventId },
      orderBy: { version: 'desc' },
      include: { runs: { select: { status: true } } },
    });
    if (!draw || !draw.runs.length) throw new DomainError(PUBLISH_MESSAGES.empty, { status: 422 });
    if (draw.runs.some((run) => run.status === 'PENDING' || run.status === 'IN_PROGRESS')) {
      throw new DomainError(PUBLISH_MESSAGES.incomplete, { status: 422 });
    }
    const now = new Date();
    const published = await tx.draw.update({ where: { id: draw.id }, data: { status: 'PUBLISHED', publishedAt: now } });
    await tx.event.update({ where: { id: eventId }, data: { status: 'FINISHED', publishedAt: now } });
    return published;
  });
}
