import { prisma } from '../../prisma';
import { computeRunResult } from '../../../lib/runResult';
import { DomainError } from '../errors';
import { eventScope } from '../scope';
import type { ScopeUser } from './owner';

// Sem 'server-only': o handler do Pages API importa este command.

export const TIME_MESSAGES = {
  notFound: 'Corrida não encontrada.',
  bull: 'Este boi não faz parte da corrida.',
  oldVersion: 'Esta corrida é de uma versão antiga do sorteio. Recarregue a página.',
  published: 'Resultado publicado: os tempos não podem mais ser alterados.',
} as const;

/**
 * Grava (ou apaga) o tempo de um boi e recalcula a corrida numa transação que trava
 * a linha da prova — a mesma trava do `generateDraw`, para um refazer e um tempo não
 * se cruzarem. User lança nas próprias provas; gerentes em todas (eventScope).
 */
export async function recordTime(user: ScopeUser, runId: string, input: { bullNumber: number; timeSeconds: number | null; isNt: boolean }) {
  const run = await prisma.run.findFirst({
    where: { id: runId, draw: { event: eventScope(user) } },
    select: { id: true, numberOfBulls: true, drawId: true, draw: { select: { eventId: true } } },
  });
  if (!run) throw new DomainError(TIME_MESSAGES.notFound, { status: 404 });
  if (input.bullNumber > run.numberOfBulls) throw new DomainError(TIME_MESSAGES.bull, { status: 422 });
  const eventId = run.draw.eventId;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { status: true, publishedAt: true } });
    if (!event || event.status === 'FINISHED' || event.publishedAt) throw new DomainError(TIME_MESSAGES.published, { status: 409 });
    const latest = await tx.draw.findFirst({ where: { eventId }, orderBy: { version: 'desc' }, select: { id: true } });
    if (latest?.id !== run.drawId) throw new DomainError(TIME_MESSAGES.oldVersion, { status: 409 });

    if (input.timeSeconds === null) {
      await tx.runTime.deleteMany({ where: { runId, bullNumber: input.bullNumber } });
    } else {
      await tx.runTime.upsert({
        where: { runId_bullNumber: { runId, bullNumber: input.bullNumber } },
        create: { runId, bullNumber: input.bullNumber, timeSeconds: input.timeSeconds, isNt: input.isNt, recordedById: user.id },
        update: { timeSeconds: input.timeSeconds, isNt: input.isNt, recordedById: user.id, recordedAt: new Date() },
      });
    }
    const times = await tx.runTime.findMany({ where: { runId }, orderBy: { bullNumber: 'asc' } });
    const result = computeRunResult(run.numberOfBulls, times.map((t) => ({ bullNumber: t.bullNumber, timeSeconds: t.timeSeconds === null ? null : Number(t.timeSeconds), isNt: t.isNt })));
    return tx.run.update({
      where: { id: runId },
      data: result,
      include: { times: { orderBy: { bullNumber: 'asc' } } },
    });
  });
}
