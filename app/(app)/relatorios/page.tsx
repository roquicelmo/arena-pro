import { ReportsPage } from '../../../src/components/ReportsPage';
import { PageHeader } from '../../../src/components/ui';
import { MANAGER_ROLES } from '../../../src/server/permissions';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';

export default async function RelatoriosPage() {
  const user = await requireUser();
  const owners = await listOwners(user);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Relatórios" description="Acompanhe a operação consolidada por usuário e período." />
      <div className="mt-6">
        <ReportsPage owners={owners} canFilterOwners={(MANAGER_ROLES as readonly string[]).includes(user.role)} />
      </div>
    </main>
  );
}
