import 'server-only';
import type { EventSummary } from '../../types/events';
import { toEventSummary } from '../../lib/mappers';
import { prisma } from '../prisma';
import { eventScope } from './scope';
import { eventInclude, findEventsRaw } from './raw';

type ScopeUser = { id: string; role: string };

export const listEvents = async (user: ScopeUser, opts: { ownerId?: string } = {}): Promise<EventSummary[]> =>
  (await findEventsRaw(user, opts)).map(toEventSummary);

/** Devolve null quando a prova não existe ou está fora do escopo do usuário. */
export const getEvent = async (user: ScopeUser, eventId: string): Promise<EventSummary | null> => {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScope(user) },
    include: eventInclude,
  });
  return event ? toEventSummary(event) : null;
};
