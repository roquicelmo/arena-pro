import { EventsView } from '../../../../src/components/events/EventsView';
import { isAdmin, isManager } from '../../../../src/server/permissions';
import { listArenas } from '../../../../src/server/services/arenas';
import { listEvents } from '../../../../src/server/services/events';
import { getDefaultCity, listStates } from '../../../../src/server/services/localities';
import { listOwners } from '../../../../src/server/services/users';
import { requireUser } from '../../../../src/server/session';

type Param = string | string[] | undefined;

export default async function ProvasPage({ searchParams }: { searchParams: Promise<{ dono?: Param; canceladas?: Param }> }) {
  const user = await requireUser();
  const canFilterOwners = isAdmin(user.role) || isManager(user.role);
  const { dono, canceladas } = await searchParams;
  const ownerFilter = canFilterOwners && typeof dono === 'string' ? dono : '';
  const [events, arenas, owners, states, defaultCity] = await Promise.all([
    listEvents(user, { ownerId: ownerFilter || undefined }),
    listArenas(user, { ownerId: ownerFilter || undefined }),
    listOwners(user),
    listStates(),
    getDefaultCity(),
  ]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <EventsView
        events={events}
        arenas={arenas}
        owners={owners}
        canFilterOwners={canFilterOwners}
        ownerFilter={ownerFilter}
        showCancelled={canceladas === '1'}
        currentUserId={user.id}
        states={states}
        defaultCity={defaultCity}
      />
    </main>
  );
}
