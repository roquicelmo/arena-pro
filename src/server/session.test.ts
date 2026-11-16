import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from './auth';

const getAuthenticatedUser = vi.fn<(headers: Headers) => Promise<AuthenticatedUser | null>>();

vi.mock('server-only', () => ({}));
vi.mock('./auth', () => ({ getAuthenticatedUser }));
vi.mock('./prisma', () => ({ prisma: { user: { findUnique: async () => ({ name: 'Ana' }) } } }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'session=abc' }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

const { ActionAuthError, getCurrentUser, getCurrentUserProfile, requireActionUser, requireRole, requireUser } = await import('./session');
const { MANAGER_ROLES, OPERATOR_ROLES } = await import('./permissions');

const mockAuth = (user: AuthenticatedUser | null) => getAuthenticatedUser.mockResolvedValue(user);

describe('session', () => {
  beforeEach(() => getAuthenticatedUser.mockReset());

  it('getCurrentUserProfile traz o nome e devolve null sem sessão', async () => {
    mockAuth({ id: 'u1', email: 'a@b.c', role: 'USER' });
    await expect(getCurrentUserProfile()).resolves.toEqual({ id: 'u1', name: 'Ana', email: 'a@b.c', role: 'USER' });
    mockAuth(null);
    await expect(getCurrentUserProfile()).resolves.toBeNull();
  });

  it('getCurrentUser repassa os headers da requisição', async () => {
    mockAuth({ id: 'u1', role: 'USER' });
    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'u1' });
    expect(getAuthenticatedUser.mock.calls[0][0].get('cookie')).toBe('session=abc');
  });

  it('requireUser redireciona sem sessão', async () => {
    mockAuth(null);
    await expect(requireUser()).rejects.toThrow('REDIRECT:/login');
  });

  it('requireRole recusa VIEWER (usuário bloqueado/expirado)', async () => {
    mockAuth({ id: 'u1', role: 'VIEWER' });
    await expect(requireRole(OPERATOR_ROLES)).rejects.toThrow('NOT_FOUND');
  });

  it('requireRole aceita ORGANIZER como manager', async () => {
    mockAuth({ id: 'u1', role: 'ORGANIZER' });
    await expect(requireRole(MANAGER_ROLES)).resolves.toMatchObject({ id: 'u1' });
  });

  it('requireActionUser lança ActionAuthError sem sessão', async () => {
    mockAuth(null);
    await expect(requireActionUser()).rejects.toBeInstanceOf(ActionAuthError);
  });

  it('requireActionUser sem papéis explícitos recusa VIEWER', async () => {
    mockAuth({ id: 'u1', role: 'VIEWER' });
    await expect(requireActionUser()).rejects.toBeInstanceOf(ActionAuthError);
  });

  it('requireActionUser lança ActionAuthError para papel não permitido', async () => {
    mockAuth({ id: 'u1', role: 'USER' });
    await expect(requireActionUser(MANAGER_ROLES)).rejects.toBeInstanceOf(ActionAuthError);
  });
});
