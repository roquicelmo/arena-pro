import 'server-only';
import { findAthletesRaw } from './raw';
import type { Competitor } from '../../types/roping';
import { toCompetitor } from '../../lib/mappers';

type ScopeUser = { id: string; role: string };

export const listAthletes = async (user: ScopeUser, opts: { ownerId?: string } = {}): Promise<Competitor[]> =>
  (await findAthletesRaw(user, opts)).map((athlete) => toCompetitor(athlete));
