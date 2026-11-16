import type { Arena } from '@prisma/client';
import { prisma } from '../../prisma';
import { canAccessOwnerData } from '../../permissions';
import { DomainError, notFound } from '../errors';
import { accessScope } from '../scope';
import { FORBIDDEN_MESSAGE, canAssignOwner, resolveCity, resolveOwnerId, type Db, type ScopeUser } from './owner';

export interface ArenaData {
  name: string;
  cityCode?: number;
  city?: string;
  state?: string;
}

type Place = { cityCode: number | null; city: string | null; state: string | null };

const samePlace = (place: Place) =>
  place.cityCode != null
    ? { cityCode: place.cityCode }
    : { city: { equals: place.city ?? '', mode: 'insensitive' as const }, state: place.state ?? '' };

export async function createArena(
  user: ScopeUser,
  data: ArenaData & { ownerId?: string },
  tx?: Db,
): Promise<{ arena: Arena; created: boolean }> {
  const db = tx ?? prisma;
  const ownerId = await resolveOwnerId(user, data.ownerId, db);
  const place = await resolveCity(data);

  const existing = await db.arena.findFirst({
    where: { active: true, ownerId, name: { equals: data.name, mode: 'insensitive' }, ...samePlace(place) },
  });
  if (existing) return { arena: existing, created: false };

  const arena = await db.arena.create({
    data: { name: data.name, ...place, city: place.city ?? '', state: place.state ?? '', ownerId },
  });
  return { arena, created: true };
}

async function findEditableArena(user: ScopeUser, id: string) {
  const target = await prisma.arena.findFirst({
    where: { id, active: true, ...accessScope(user) },
    select: { id: true, ownerId: true, name: true, city: true, state: true, cityCode: true },
  });
  if (!target) throw notFound('Arena');
  if (!canAccessOwnerData(user.role, user.id, target.ownerId)) {
    throw new DomainError(FORBIDDEN_MESSAGE, { status: 403 });
  }
  return target;
}

export async function updateArena(
  user: ScopeUser,
  id: string,
  data: Partial<ArenaData> & { ownerId?: string },
): Promise<Arena> {
  const target = await findEditableArena(user, id);

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.cityCode != null) {
    Object.assign(update, await resolveCity({ cityCode: data.cityCode }));
  } else if (data.city !== undefined || data.state !== undefined) {
    update.cityCode = null;
    if (data.city !== undefined) update.city = data.city;
    if (data.state !== undefined) update.state = data.state;
  }
  if (data.ownerId !== undefined && canAssignOwner(user)) {
    update.ownerId = await resolveOwnerId(user, data.ownerId);
  }

  if (update.name !== undefined || 'city' in update || 'cityCode' in update) {
    const next: Place = {
      cityCode: ('cityCode' in update ? (update.cityCode as number | null) : target.cityCode) ?? null,
      city: ('city' in update ? (update.city as string) : target.city) ?? null,
      state: ('state' in update ? (update.state as string) : target.state) ?? null,
    };
    const clash = await prisma.arena.findFirst({
      where: {
        active: true,
        id: { not: id },
        ownerId: target.ownerId,
        name: { equals: (update.name as string | undefined) ?? target.name, mode: 'insensitive' },
        ...samePlace(next),
      },
      select: { id: true },
    });
    if (clash) throw new DomainError('Já existe uma arena com esse nome nessa cidade.', { status: 409, field: 'name' });
  }

  return prisma.arena.update({ where: { id }, data: update });
}

export async function deactivateArena(user: ScopeUser, id: string): Promise<void> {
  await findEditableArena(user, id);
  await prisma.arena.update({ where: { id }, data: { active: false } });
}
