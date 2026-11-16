import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getEvent } from '../../../../src/server/services/events';
import { requireUser } from '../../../../src/server/session';

/**
 * Usuário + prova no escopo dele, deduplicado por requisição. Prova inexistente
 * ou fora do escopo responde 404. O layout e cada página chamam: na navegação
 * client-side o layout não roda de novo, então a página refaz a checagem.
 */
export const loadEvent = cache(async (eventId: string) => {
  const user = await requireUser();
  const event = await getEvent(user, eventId);
  if (!event) notFound();
  return { user, event };
});
