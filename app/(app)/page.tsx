import { Dashboard } from '../../src/components/Dashboard';
import { PageHeader } from '../../src/components/ui';
import { MANAGER_ROLES } from '../../src/server/permissions';
import { listAthletes } from '../../src/server/services/athletes';
import { listEvents } from '../../src/server/services/events';
import { listOwners } from '../../src/server/services/users';
import { requireUser } from '../../src/server/session';

export default async function HomePage() {
  const user = await requireUser();
  const [athletes, events, owners] = await Promise.all([listAthletes(user), listEvents(user), listOwners(user)]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Painel" description="Visão geral das suas provas e atletas." />
      <div className="mt-6">
        <Dashboard
          athleteCount={athletes.length}
          startDrawHref="/sorteio-avulso"
          events={events}
          owners={owners}
          canFilterOwners={(MANAGER_ROLES as readonly string[]).includes(user.role)}
        />
      </div>
    </main>
  );
}
