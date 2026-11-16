import 'server-only';
import { prisma } from '../prisma';
import { accessScope } from './scope';
import type { ArenaOption } from '../../types/arenas';

type ScopeUser = { id: string; role: string };

export const listArenas = async (user: ScopeUser, opts: { ownerId?: string } = {}): Promise<ArenaOption[]> => {
  const arenas = await prisma.arena.findMany({
    where: { active: true, ...accessScope(user, opts.ownerId) },
    select: { id: true, name: true, city: true, state: true, cityCode: true, ownerId: true, owner: { select: { name: true } } },
    orderBy: [{ name: 'asc' }, { city: 'asc' }],
  });
  return arenas.map(({ id, name, city, state, cityCode, ownerId, owner }) => ({
    id,
    name,
    city,
    state,
    ...(cityCode != null ? { cityCode } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(owner ? { ownerName: owner.name } : {}),
  }));
};
