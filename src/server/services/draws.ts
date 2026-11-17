import 'server-only';
import type { Competitor, DrawConfig, Run } from '../../types/roping';
import { parseDrawConfig } from '../../lib/drawDefaults';
import { mapPersistedRuns, toCompetitor } from '../../lib/mappers';
import { prisma } from '../prisma';
import { eventScope } from './scope';
import { findDrawsRaw, findRegistrationsRaw } from './raw';

type ScopeUser = { id: string; role: string };

const isInScope = async (user: ScopeUser, eventId: string) => {
  const event = await prisma.event.findFirst({ where: { id: eventId, ...eventScope(user) }, select: { id: true } });
  return Boolean(event);
};

export const getLatestDrawRuns = async (user: ScopeUser, eventId: string): Promise<Run[] | null> => {
  if (!(await isInScope(user, eventId))) return null;
  const [latest] = await findDrawsRaw(eventId, { take: 1 });
  return latest ? mapPersistedRuns(latest.runs) : [];
};

/**
 * Último sorteio da prova: corridas + configuração persistida (validada sobre o
 * padrão). Sem sorteio: `runs: []` e a configuração padrão. Fora do escopo: null.
 */
export const getLatestDraw = async (
  user: ScopeUser,
  eventId: string,
): Promise<{ runs: Run[]; configuration: DrawConfig } | null> => {
  if (!(await isInScope(user, eventId))) return null;
  const [latest] = await findDrawsRaw(eventId, { take: 1 });
  return {
    runs: latest ? mapPersistedRuns(latest.runs) : [],
    configuration: parseDrawConfig(latest?.configuration),
  };
};

export const getEventRegistrations = async (
  user: ScopeUser,
  eventId: string,
): Promise<{ cabeceiros: Competitor[]; pezeiros: Competitor[] } | null> => {
  if (!(await isInScope(user, eventId))) return null;
  const registrations = await findRegistrationsRaw(eventId);
  return {
    cabeceiros: registrations.filter((r) => r.category === 'CABECEIRO').map((r) => toCompetitor(r.athlete, 'head')),
    pezeiros: registrations.filter((r) => r.category === 'PEZEIRO').map((r) => toCompetitor(r.athlete, 'heel')),
  };
};

export interface EventRegistrationItem {
  registrationId: string;
  category: 'CABECEIRO' | 'PEZEIRO';
  athlete: Competitor;
}

/** Inscrições ativas com o id da inscrição (para cancelar). Fora do escopo: null. */
export const listEventRegistrations = async (user: ScopeUser, eventId: string): Promise<EventRegistrationItem[] | null> => {
  if (!(await isInScope(user, eventId))) return null;
  const registrations = await findRegistrationsRaw(eventId);
  return registrations.map((r) => ({
    registrationId: r.id,
    category: r.category as EventRegistrationItem['category'],
    athlete: toCompetitor(r.athlete, r.category === 'PEZEIRO' ? 'heel' : 'head'),
  }));
};

/** Versão vigente do sorteio (ou null sem sorteio). */
export const getLatestDrawVersion = async (eventId: string): Promise<number | null> =>
  (await prisma.draw.findFirst({ where: { eventId }, orderBy: { version: 'desc' }, select: { version: true } }))?.version ?? null;
