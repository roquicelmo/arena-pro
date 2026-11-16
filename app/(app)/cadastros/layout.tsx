import { MANAGER_ROLES } from '../../../src/server/permissions';
import { requireRole } from '../../../src/server/session';

export default async function CadastrosLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole(MANAGER_ROLES);
  return children;
}
