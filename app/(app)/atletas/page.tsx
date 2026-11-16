import { AthletesView } from '../../../src/components/athletes/AthletesView';
import { isAdmin, isManager } from '../../../src/server/permissions';
import { listAthletes } from '../../../src/server/services/athletes';
import { getAthleteNotes } from '../../../src/server/services/commands/athletes';
import { getDefaultCity, listStates } from '../../../src/server/services/localities';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';

export default async function AtletasPage({ searchParams }: { searchParams: Promise<{ dono?: string | string[] }> }) {
  const user = await requireUser();
  const canFilterOwners = isAdmin(user.role) || isManager(user.role);
  const { dono } = await searchParams;
  const ownerFilter = canFilterOwners && typeof dono === 'string' ? dono : '';
  const [athletes, owners, states, defaultCity] = await Promise.all([
    listAthletes(user, { ownerId: ownerFilter || undefined }),
    listOwners(user),
    listStates(),
    getDefaultCity(),
  ]);
  const notes = await getAthleteNotes(user, athletes.map((athlete) => athlete.id));
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <AthletesView
        athletes={athletes}
        notes={notes}
        owners={owners}
        canFilterOwners={canFilterOwners}
        ownerFilter={ownerFilter}
        currentUserId={user.id}
        states={states}
        defaultCity={defaultCity}
      />
    </main>
  );
}
