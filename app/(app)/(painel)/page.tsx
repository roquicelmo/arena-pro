import { Dashboard } from '../../../src/components/Dashboard';
import { PageHeader } from '../../../src/components/ui';
import { isAdmin, isManager } from '../../../src/server/permissions';
import { listAthletes } from '../../../src/server/services/athletes';
import { listEvents } from '../../../src/server/services/events';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';

type Param = string | string[] | undefined;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ dono?: Param }> }) {
  const user = await requireUser();
  const canFilterOwners = isAdmin(user.role) || isManager(user.role);
  const { dono } = await searchParams;
  const ownerFilter = canFilterOwners && typeof dono === 'string' ? dono : '';
  const ownerId = ownerFilter || undefined;
  const [athletes, events, owners] = await Promise.all([
    listAthletes(user, { ownerId }),
    listEvents(user, { ownerId }),
    canFilterOwners ? listOwners(user) : Promise.resolve([]),
  ]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Painel" description="Visão geral das suas provas e atletas." />
      <div className="mt-6">
        <Dashboard
          athleteCount={athletes.length}
          startDrawHref="/sorteio-avulso"
          events={events}
          owners={owners}
          canFilterOwners={canFilterOwners}
          ownerFilter={ownerFilter}
        />
      </div>
    </main>
  );
}
