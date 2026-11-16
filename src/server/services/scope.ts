import { isManager, isAdmin } from '../permissions';

type ScopeUser = { id: string; role: string };

const canSeeAllOwners = (role: string) => isAdmin(role) || isManager(role);

/** USER (e qualquer papel não gerente) vê só o que é seu; gerentes podem filtrar por dono. */
export const ownerScope = (user: ScopeUser, ownerId?: string): { ownerId?: string } => {
  if (!canSeeAllOwners(user.role)) return { ownerId: user.id };
  return ownerId ? { ownerId } : {};
};

type AccessClause = { ownerId: string } | { shares: { some: { userId: string } } };

/**
 * Atletas e arenas: o dono ou quem recebeu o compartilhamento.
 * Gerente sem filtro vê tudo; com filtro X, vê os de X e os compartilhados com X.
 */
export const accessScope = (user: ScopeUser, ownerId?: string): { OR?: AccessClause[] } => {
  const subjectId = canSeeAllOwners(user.role) ? ownerId : user.id;
  if (!subjectId) return {};
  return { OR: [{ ownerId: subjectId }, { shares: { some: { userId: subjectId } } }] };
};

export const eventScope = (user: ScopeUser, ownerId?: string): { createdById?: string } => {
  const scope = ownerScope(user, ownerId);
  return scope.ownerId ? { createdById: scope.ownerId } : {};
};
