import 'server-only';
import { eventStatusBadge } from '../../components/ui/Badge';
import { prisma } from '../prisma';
import { OPERATOR_ROLES } from '../permissions';
import { accessScope, eventScope } from './scope';

type ScopeUser = { id: string; role: string };

export type ManagedType = 'atletas' | 'arenas' | 'provas';

export interface ManagedRecord {
  id: string;
  name: string;
  detail: string;
  ownerId: string | null;
  ownerName: string | null;
  sharedWith: Array<{ id: string; name: string }>;
}

const ownerSelect = { select: { name: true, email: true } } as const;
const sharesSelect = { select: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } } as const;
const label = (u: { name: string | null; email: string }) => u.name ?? u.email;
const place = (city: string | null, state: string | null) => (city ? `${city}/${state ?? ''}` : '—');
const handicap = (value: { toString(): string }) => Number(value.toString()).toFixed(1).replace('.', ',');
const formatDate = (date: Date) =>
  `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;

export async function listManagedRecords(
  user: ScopeUser,
  { type, userId }: { type: ManagedType; userId?: string },
): Promise<ManagedRecord[]> {
  if (type === 'atletas') {
    const athletes = await prisma.athlete.findMany({
      where: { active: true, ...accessScope(user, userId) },
      select: {
        id: true, name: true, city: true, state: true, headHandicap: true, heelHandicap: true, ownerId: true,
        owner: ownerSelect, shares: sharesSelect,
      },
      orderBy: { name: 'asc' },
    });
    return athletes.map((a) => ({
      id: a.id,
      name: a.name,
      detail: `${place(a.city, a.state)} · HC ${handicap(a.headHandicap)} / ${handicap(a.heelHandicap)}`,
      ownerId: a.ownerId,
      ownerName: a.owner ? label(a.owner) : null,
      sharedWith: a.shares.map((s) => ({ id: s.user.id, name: label(s.user) })),
    }));
  }
  if (type === 'arenas') {
    const arenas = await prisma.arena.findMany({
      where: { active: true, ...accessScope(user, userId) },
      select: { id: true, name: true, city: true, state: true, ownerId: true, owner: ownerSelect, shares: sharesSelect },
      orderBy: [{ name: 'asc' }, { city: 'asc' }],
    });
    return arenas.map((a) => ({
      id: a.id,
      name: a.name,
      detail: place(a.city, a.state),
      ownerId: a.ownerId,
      ownerName: a.owner ? label(a.owner) : null,
      sharedWith: a.shares.map((s) => ({ id: s.user.id, name: label(s.user) })),
    }));
  }
  const events = await prisma.event.findMany({
    where: { status: { not: 'CANCELLED' }, ...eventScope(user, userId) },
    select: {
      id: true, name: true, eventDate: true, status: true, createdById: true,
      arena: { select: { name: true } }, createdBy: ownerSelect,
    },
    orderBy: [{ eventDate: 'desc' }, { name: 'asc' }],
  });
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    detail: `${formatDate(e.eventDate)} · ${e.arena.name} · ${eventStatusBadge(e.status).label}`,
    ownerId: e.createdById,
    ownerName: label(e.createdBy),
    sharedWith: [],
  }));
}

/** Usuários ativos que podem receber compartilhamentos e responsabilidade por provas. */
export async function listShareTargets(
  user: ScopeUser,
): Promise<Array<{ id: string; name: string | null; email: string }>> {
  void user;
  return prisma.user.findMany({
    where: { active: true, role: { in: [...OPERATOR_ROLES] } },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
}
