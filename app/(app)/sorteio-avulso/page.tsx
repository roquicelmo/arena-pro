import { PageHeader } from '../../../src/components/ui';
import { MANAGER_ROLES } from '../../../src/server/permissions';
import { listAthletes } from '../../../src/server/services/athletes';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';
import { QuickDrawClient } from './QuickDrawClient';

export default async function SorteioAvulsoPage() {
  const user = await requireUser();
  const [athletes, owners] = await Promise.all([listAthletes(user), listOwners(user)]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Sorteio avulso" description="Monte um sorteio rápido com os atletas cadastrados. Nada é salvo: os tempos ficam só nesta tela." />
      <div className="mt-6">
        <QuickDrawClient
          athletes={athletes}
          owners={owners}
          canAssignOwner={(MANAGER_ROLES as readonly string[]).includes(user.role)}
          defaultOwnerId={user.id}
        />
      </div>
    </main>
  );
}
