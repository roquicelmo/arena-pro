import 'server-only';
import { findArenasRaw } from './raw';
import type { ArenaOption } from '../../components/EventsPage';

type ScopeUser = { id: string; role: string };

export const listArenas = async (user: ScopeUser, opts: { ownerId?: string } = {}): Promise<ArenaOption[]> =>
  (await findArenasRaw(user, opts)).map(({ id, name, city, state }) => ({ id, name, city, state }));
