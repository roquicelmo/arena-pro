import { prisma } from '../../prisma';
import { DomainError, notFound } from '../errors';
import { eventInclude } from '../raw';
import { accessScope, eventScope } from '../scope';
import { createArena, type ArenaData } from './arenas';
import { resolveOwnerId, type ScopeUser } from './owner';

type EventWithInclude = Awaited<ReturnType<typeof createEventRecord>>;
const createEventRecord = (db: typeof prisma, data: { name: string; eventDate: Date; arenaId: string; createdById: string }) =>
  db.event.create({ data: { ...data, status: 'DRAFT' }, include: eventInclude });

export async function createEvent(
  user: ScopeUser,
  data: { name: string; eventDate: Date; arenaId?: string; newArena?: ArenaData; ownerId?: string },
): Promise<EventWithInclude> {
  return prisma.$transaction(async (tx) => {
    const ownerId = await resolveOwnerId(user, data.ownerId, tx);
    let arenaId: string;
    if (data.arenaId) {
      const arena = await tx.arena.findFirst({
        where: { id: data.arenaId, active: true, ...accessScope(user) },
        select: { id: true },
      });
      if (!arena) throw new DomainError('Arena não encontrada ou inativa.', { status: 404, field: 'arenaId' });
      arenaId = arena.id;
    } else if (data.newArena) {
      arenaId = (await createArena(user, { ...data.newArena, ownerId }, tx)).arena.id;
    } else {
      throw new DomainError('Escolha uma arena.', { field: 'arenaId' });
    }
    return createEventRecord(tx as typeof prisma, { name: data.name, eventDate: data.eventDate, arenaId, createdById: ownerId });
  });
}

export async function updateEvent(
  user: ScopeUser,
  id: string,
  data: { name?: string; eventDate?: Date },
): Promise<EventWithInclude> {
  const target = await prisma.event.findFirst({ where: { id, ...eventScope(user) }, select: { id: true } });
  if (!target) throw notFound('Prova');
  return prisma.event.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.eventDate ? { eventDate: data.eventDate } : {}),
    },
    include: eventInclude,
  });
}

export async function cancelEvent(user: ScopeUser, id: string): Promise<void> {
  const target = await prisma.event.findFirst({ where: { id, ...eventScope(user) }, select: { id: true, status: true } });
  if (!target) throw notFound('Prova');
  if (target.status === 'CANCELLED') return;
  await prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });
}
