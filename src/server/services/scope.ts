import { isManager, isAdmin } from '../permissions';

type ScopeUser = { id: string; role: string };

const canSeeAllOwners = (role: string) => isAdmin(role) || isManager(role);

/** USER (e qualquer papel não gerente) vê só o que é seu; gerentes podem filtrar por dono. */
export const ownerScope = (user: ScopeUser, ownerId?: string): { ownerId?: string } => {
  if (!canSeeAllOwners(user.role)) return { ownerId: user.id };
  return ownerId ? { ownerId } : {};
};

export const eventScope = (user: ScopeUser, ownerId?: string): { createdById?: string } => {
  const scope = ownerScope(user, ownerId);
  return scope.ownerId ? { createdById: scope.ownerId } : {};
};
