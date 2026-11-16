import { AgendaPage } from '../../../src/components/AgendaPage';
import { PageHeader } from '../../../src/components/ui';
import { MANAGER_ROLES } from '../../../src/server/permissions';
import { listEvents } from '../../../src/server/services/events';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';

export default async function AgendaRoute() {
  const user = await requireUser();
  const [events, owners] = await Promise.all([listEvents(user), listOwners(user)]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Minha agenda" description="Datas, arenas e status de todas as provas cadastradas." />
      <div className="mt-6">
        <AgendaPage events={events} owners={owners} canFilterOwners={(MANAGER_ROLES as readonly string[]).includes(user.role)} />
      </div>
    </main>
  );
}
