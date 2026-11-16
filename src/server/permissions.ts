/** Papéis com visão e gestão de todos os proprietários (ORGANIZER é legado de MANAGER). */
export const MANAGER_ROLES = ['ADMIN', 'MANAGER', 'ORGANIZER'] as const;
/** Papéis que operam dados (provas, atletas, sorteios, tempos). VIEWER = bloqueado/expirado. */
export const OPERATOR_ROLES = ['ADMIN', 'MANAGER', 'ORGANIZER', 'USER'] as const;

export const isAdmin = (role: string) => role === 'ADMIN';
export const isManager = (role: string) => role === 'MANAGER' || role === 'ORGANIZER';
export const canManageUsers = (role: string) => isAdmin(role) || isManager(role);
export const canEditUsers = (role: string) => isAdmin(role);
export const canManageData = (role: string) => isAdmin(role) || isManager(role) || role === 'USER';

export const canAccessOwnerData = (role: string, userId: string, ownerId: string | null | undefined) =>
  isAdmin(role) || isManager(role) || ownerId === userId;
