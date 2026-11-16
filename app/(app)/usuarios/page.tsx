import { UsersView } from '../../../src/components/users/UsersView';
import { isAdmin, MANAGER_ROLES } from '../../../src/server/permissions';
import { listPendingAccessRequests } from '../../../src/server/services/commands/accessRequests';
import { findUsersRaw } from '../../../src/server/services/raw';
import { requireRole } from '../../../src/server/session';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export default async function UsuariosPage() {
  const user = await requireRole(MANAGER_ROLES);
  const [users, requests] = await Promise.all([findUsersRaw(), listPendingAccessRequests()]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <UsersView
        currentUserId={user.id}
        isAdmin={isAdmin(user.role)}
        users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, provisional: u.provisional, accessExpiresAt: iso(u.accessExpiresAt), lastLoginAt: iso(u.lastLoginAt) }))}
        requests={requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
      />
    </main>
  );
}
