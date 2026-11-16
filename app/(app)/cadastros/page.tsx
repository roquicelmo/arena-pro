import { RecordsManager } from '../../../src/components/records/RecordsManager';
import { PageHeader } from '../../../src/components/ui';
import { MANAGER_ROLES } from '../../../src/server/permissions';
import { listManagedRecords, listShareTargets, type ManagedType } from '../../../src/server/services/records';
import { requireRole } from '../../../src/server/session';

const TYPES: ManagedType[] = ['atletas', 'arenas', 'provas'];

export default async function CadastrosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string | string[]; usuario?: string | string[] }>;
}) {
  const user = await requireRole(MANAGER_ROLES);
  const { tipo, usuario } = await searchParams;
  const type = TYPES.find((t) => t === tipo) ?? 'atletas';
  const userId = typeof usuario === 'string' ? usuario : '';
  const [records, users] = await Promise.all([
    listManagedRecords(user, { type, userId: userId || undefined }),
    listShareTargets(user),
  ]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        title="Manejo de cadastros"
        description="Compartilhe atletas e arenas com usuários e defina o responsável de cada prova."
      />
      <RecordsManager type={type} userId={userId} records={records} users={users} />
    </main>
  );
}
