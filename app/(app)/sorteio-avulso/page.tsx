import { PageHeader } from '../../../src/components/ui';
import { listAthletes } from '../../../src/server/services/athletes';
import { getDefaultCity, listStates } from '../../../src/server/services/localities';
import { isAdmin, isManager } from '../../../src/server/permissions';
import { requireUser } from '../../../src/server/session';
import { QuickDrawClient } from './QuickDrawClient';

export default async function SorteioAvulsoPage() {
  const user = await requireUser();
  const [athletes, states, defaultCity] = await Promise.all([listAthletes(user), listStates(), getDefaultCity()]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Sorteio avulso" description="Monte um sorteio rápido com os atletas cadastrados. Nada é salvo: os tempos ficam só nesta tela." />
      <div className="mt-6">
        <QuickDrawClient
          athletes={athletes}
          states={states}
          defaultCity={defaultCity}
          canFilterOwners={isAdmin(user.role) || isManager(user.role)}
        />
      </div>
    </main>
  );
}
