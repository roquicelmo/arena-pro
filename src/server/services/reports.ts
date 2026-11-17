import 'server-only';
import { prisma } from '../prisma';
import { toEventSummary } from '../../lib/mappers';
import type { EventSummary } from '../../types/events';
import { eventInclude } from './raw';
import { accessScope, eventScope } from './scope';

type ScopeUser = { id: string; role: string };
const STATUSES = ['DRAFT', 'OPEN', 'DRAWN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] as const;
type DbStatus = (typeof STATUSES)[number];

export interface ReportFilters { ownerId?: string; status?: string; from?: string; to?: string }

const isoDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** Monta o filtro de provas: escopo do usuário (User ignora `ownerId` alheio), status válido e período em UTC. */
export function reportEventWhere(user: ScopeUser, filters: ReportFilters) {
  const from = isoDate(filters.from);
  const to = isoDate(filters.to);
  const status = (STATUSES as readonly string[]).includes(filters.status ?? '') ? (filters.status as DbStatus) : undefined;
  return {
    ...eventScope(user, filters.ownerId),
    ...(status ? { status } : {}),
    ...(from || to ? { eventDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}),
  };
}

/** Totais e provas recentes do relatório (atletas/arenas contam os compartilhados, spec 6.9). */
export async function getReportOverview(user: ScopeUser, filters: ReportFilters): Promise<{ totals: Record<'events' | 'athletes' | 'arenas' | 'draws' | 'runs', number>; recent: EventSummary[] }> {
  const where = reportEventWhere(user, filters);
  const owned = { active: true, ...accessScope(user, filters.ownerId) };
  const [events, athletes, arenas, draws, runs, recent] = await prisma.$transaction([
    prisma.event.count({ where }),
    prisma.athlete.count({ where: owned }),
    prisma.arena.count({ where: owned }),
    prisma.draw.count({ where: { event: where } }),
    prisma.run.count({ where: { draw: { event: where } } }),
    prisma.event.findMany({ where, include: eventInclude, orderBy: { eventDate: 'desc' }, take: 10 }),
  ]);
  return { totals: { events, athletes, arenas, draws, runs }, recent: recent.map(toEventSummary) };
}
