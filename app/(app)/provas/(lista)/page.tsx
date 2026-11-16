import { PageHeader } from '../../../../src/components/ui';
import { MANAGER_ROLES } from '../../../../src/server/permissions';
import { listArenas } from '../../../../src/server/services/arenas';
import { listEvents } from '../../../../src/server/services/events';
import { listOwners } from '../../../../src/server/services/users';
import { requireUser } from '../../../../src/server/session';
import { EventsClient } from './EventsClient';

export default async function ProvasPage() {
  const user = await requireUser();
  const [events, arenas, owners] = await Promise.all([listEvents(user), listArenas(user), listOwners(user)]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Provas e arenas" />
      <div className="mt-6">
        <EventsClient
          events={events}
          arenas={arenas}
          owners={owners}
          canFilterOwners={(MANAGER_ROLES as readonly string[]).includes(user.role)}
          defaultOwnerId={user.id}
        />
      </div>
    </main>
  );
}
