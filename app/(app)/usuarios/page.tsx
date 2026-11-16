import { UsersPage } from '../../../src/components/UsersPage';
import { PageHeader } from '../../../src/components/ui';
import { MANAGER_ROLES } from '../../../src/server/permissions';
import { requireRole } from '../../../src/server/session';

export default async function UsuariosPage() {
  const user = await requireRole(MANAGER_ROLES);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Usuários" description="Administre perfis, acessos provisórios e permissões." />
      <div className="mt-6">
        <UsersPage role={user.role} />
      </div>
    </main>
  );
}
