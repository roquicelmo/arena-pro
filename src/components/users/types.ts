export interface ManagedUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean;
  provisional: boolean;
  accessExpiresAt: string | null;
  lastLoginAt: string | null;
}

export interface PendingRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrador', MANAGER: 'Manager', ORGANIZER: 'Manager', USER: 'Usuário', VIEWER: 'Visualizador' };
