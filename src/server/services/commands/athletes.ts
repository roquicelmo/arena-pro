import type { Athlete } from '@prisma/client';
import { prisma } from '../../prisma';
import { normalizeName } from '../../../lib/text';
import { canAccessOwnerData } from '../../permissions';
import { DomainError, notFound } from '../errors';
import { accessScope } from '../scope';
import { FORBIDDEN_MESSAGE, canAssignOwner, resolveCity, resolveOwnerId, type ScopeUser } from './owner';

export interface AthleteData {
  name: string;
  nickname?: string | null;
  club?: string | null;
  cityCode?: number | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  headHandicap?: number | null;
  heelHandicap?: number | null;
}

export async function createAthlete(user: ScopeUser, data: AthleteData & { ownerId?: string }): Promise<Athlete> {
  const ownerId = await resolveOwnerId(user, data.ownerId);
  const place = await resolveCity(data);
  return prisma.athlete.create({
    data: {
      name: data.name,
      nickname: data.nickname || null,
      club: data.club || null,
      phone: data.phone || null,
      email: data.email || null,
      headHandicap: data.headHandicap ?? null,
      heelHandicap: data.heelHandicap ?? null,
      ...place,
      ownerId,
    },
  });
}

async function findEditableAthlete(user: ScopeUser, id: string) {
  const target = await prisma.athlete.findFirst({
    where: { id, active: true, ...accessScope(user) },
    select: { id: true, ownerId: true },
  });
  if (!target) throw notFound('Atleta');
  if (!canAccessOwnerData(user.role, user.id, target.ownerId)) {
    throw new DomainError(FORBIDDEN_MESSAGE, { status: 403 });
  }
  return target;
}

export async function updateAthlete(
  user: ScopeUser,
  id: string,
  data: Partial<AthleteData> & { ownerId?: string },
): Promise<Athlete> {
  await findEditableAthlete(user, id);

  const update: Record<string, unknown> = {};
  for (const key of ['name', 'headHandicap', 'heelHandicap'] as const) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  for (const key of ['nickname', 'club', 'phone', 'email'] as const) {
    if (data[key] !== undefined) update[key] = data[key] || null;
  }
  if (data.cityCode !== undefined || data.city !== undefined || data.state !== undefined) {
    if (data.cityCode != null) {
      Object.assign(update, await resolveCity({ cityCode: data.cityCode }));
    } else {
      // Texto livre (API legada) ou código removido: o código antigo deixa de valer.
      update.cityCode = null;
      if (data.city !== undefined) update.city = data.city || null;
      if (data.state !== undefined) update.state = data.state || null;
    }
  }
  if (data.ownerId !== undefined && canAssignOwner(user)) {
    update.ownerId = await resolveOwnerId(user, data.ownerId);
  }
  return prisma.athlete.update({ where: { id }, data: update });
}

export async function deactivateAthlete(user: ScopeUser, id: string): Promise<void> {
  await findEditableAthlete(user, id);
  await prisma.athlete.update({ where: { id }, data: { active: false } });
}

export async function saveAthleteNote(user: ScopeUser, athleteId: string, body: string): Promise<void> {
  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, active: true, ...accessScope(user) }, select: { id: true } });
  if (!athlete) throw notFound('Atleta');
  const text = body.trim();
  if (!text) {
    await prisma.athleteNote.deleteMany({ where: { athleteId, userId: user.id } });
    return;
  }
  await prisma.athleteNote.upsert({
    where: { athleteId_userId: { athleteId, userId: user.id } },
    create: { athleteId, userId: user.id, body: text },
    update: { body: text },
  });
}

export async function getAthleteNotes(user: ScopeUser, athleteIds: string[]): Promise<Record<string, string>> {
  if (athleteIds.length === 0) return {};
  const notes = await prisma.athleteNote.findMany({
    where: { userId: user.id, athleteId: { in: athleteIds } },
    select: { athleteId: true, body: true },
  });
  return Object.fromEntries(notes.map((note) => [note.athleteId, note.body]));
}

export async function findDuplicateAthletes(
  user: ScopeUser,
  input: { name: string; cityCode: number; club?: string | null },
): Promise<Array<{ id: string; name: string; city: string | null; state: string | null; club: string | null; ownerName: string | null }>> {
  const candidates = await prisma.athlete.findMany({
    where: { active: true, cityCode: input.cityCode, ...accessScope(user) },
    select: { id: true, name: true, city: true, state: true, club: true, owner: { select: { name: true } } },
  });
  const name = normalizeName(input.name);
  const club = normalizeName(input.club ?? '');
  return candidates
    .filter((a) => normalizeName(a.name) === name && normalizeName(a.club ?? '') === club)
    .map((a) => ({ id: a.id, name: a.name, city: a.city, state: a.state, club: a.club, ownerName: a.owner?.name ?? null }));
}
