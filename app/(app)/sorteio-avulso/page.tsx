import { PageHeader } from '../../../src/components/ui';
import { listAthletes } from '../../../src/server/services/athletes';
import { getDefaultCity, listStates } from '../../../src/server/services/localities';
import { isAdmin, isManager } from '../../../src/server/permissions';
import { requireUser } from '../../../src/server/session';
import { QuickDrawWizard } from '../../../src/components/quick-draw/QuickDrawWizard';

export default async function SorteioAvulsoPage() {
  const user = await requireUser();
  const [athletes, states, defaultCity] = await Promise.all([listAthletes(user), listStates(), getDefaultCity()]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Sorteio avulso" description="Sorteie sem cadastrar uma prova: escolha os participantes, configure, revise e baixe o PDF. Nada é salvo." />
      <div className="mt-6">
        <QuickDrawWizard
          athletes={athletes}
          states={states}
          defaultCity={defaultCity}
          canFilterOwners={isAdmin(user.role) || isManager(user.role)}
        />
      </div>
    </main>
  );
}
