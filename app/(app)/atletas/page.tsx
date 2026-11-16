import { PageHeader } from '../../../src/components/ui';
import { MANAGER_ROLES } from '../../../src/server/permissions';
import { listAthletes } from '../../../src/server/services/athletes';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';
import { AthletesClient } from './AthletesClient';

export default async function AtletasPage() {
  const user = await requireUser();
  const [athletes, owners] = await Promise.all([listAthletes(user), listOwners(user)]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Atletas" />
      <div className="mt-6">
        <AthletesClient
          athletes={athletes}
          owners={owners}
          canFilterOwners={(MANAGER_ROLES as readonly string[]).includes(user.role)}
          defaultOwnerId={user.id}
        />
      </div>
    </main>
  );
}
