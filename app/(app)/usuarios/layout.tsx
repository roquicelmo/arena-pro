import { MANAGER_ROLES } from '../../../src/server/permissions';
import { requireRole } from '../../../src/server/session';

export default async function UsuariosLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRole(MANAGER_ROLES);
  return children;
}
