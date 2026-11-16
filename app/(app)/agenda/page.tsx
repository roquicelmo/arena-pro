import { AgendaList } from '../../../src/components/events/AgendaList';
import { OwnerFilter } from '../../../src/components/filters/OwnerFilter';
import { PageHeader } from '../../../src/components/ui';
import { todayInSaoPaulo } from '../../../src/lib/agenda';
import { isAdmin, isManager } from '../../../src/server/permissions';
import { listEvents } from '../../../src/server/services/events';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';

type Param = string | string[] | undefined;

export default async function AgendaRoute({ searchParams }: { searchParams: Promise<{ dono?: Param }> }) {
  const user = await requireUser();
  const canFilterOwners = isAdmin(user.role) || isManager(user.role);
  const { dono } = await searchParams;
  const ownerFilter = canFilterOwners && typeof dono === 'string' ? dono : '';
  const [events, owners] = await Promise.all([
    listEvents(user, { ownerId: ownerFilter || undefined }),
    canFilterOwners ? listOwners(user) : Promise.resolve([]),
  ]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Minha agenda" description="Datas, arenas e status de todas as provas cadastradas." />
      {canFilterOwners && (
        <div className="mt-6 max-w-xs">
          <OwnerFilter owners={owners} value={ownerFilter} />
        </div>
      )}
      <div className="mt-6">
        <AgendaList events={events} today={todayInSaoPaulo()} showOwner={canFilterOwners} />
      </div>
    </main>
  );
}
