import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { encode } from '@auth/core/jwt';

const SECRET = 'test-secret-for-unit-tests-only-0123456789';

const findUnique = vi.fn();
vi.mock('./prisma', () => ({ prisma: { user: { findUnique } } }));

const activeUser = { role: 'USER', active: true, accessExpiresAt: null };

let getAuthenticatedUser: typeof import('./auth').getAuthenticatedUser;

beforeAll(async () => {
  process.env.AUTH_SECRET = SECRET;
  ({ getAuthenticatedUser } = await import('./auth'));
});

const sessionCookie = async (name: string) => {
  const token = await encode({
    secret: SECRET,
    salt: name,
    token: { sub: 'user-1', email: 'a@sorteios.test', role: 'USER' },
  });
  return `${name}=${token}`;
};

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    findUnique.mockReset();
    findUnique.mockResolvedValue(activeUser);
  });

  it('lê o cookie de sessão sem prefixo em requisições http (localhost)', async () => {
    const headers = new Headers({
      cookie: await sessionCookie('authjs.session-token'),
      host: 'localhost:3100',
      'x-forwarded-proto': 'http',
    });
    await expect(getAuthenticatedUser(headers)).resolves.toMatchObject({ id: 'user-1', role: 'USER' });
  });

  it('lê o cookie __Secure- em requisições https (produção)', async () => {
    const headers = new Headers({
      cookie: await sessionCookie('__Secure-authjs.session-token'),
      host: 'sorteios.example',
      'x-forwarded-proto': 'https',
    });
    await expect(getAuthenticatedUser(headers)).resolves.toMatchObject({ id: 'user-1', role: 'USER' });
  });

  it('retorna null sem cookie', async () => {
    await expect(getAuthenticatedUser(new Headers({ host: 'localhost:3100' }))).resolves.toBeNull();
  });

  it('rebaixa para VIEWER um usuário bloqueado depois do login', async () => {
    findUnique.mockResolvedValue({ role: 'ADMIN', active: false, accessExpiresAt: null });
    const headers = new Headers({ cookie: await sessionCookie('authjs.session-token'), host: 'localhost:3100', 'x-forwarded-proto': 'http' });
    await expect(getAuthenticatedUser(headers)).resolves.toMatchObject({ id: 'user-1', role: 'VIEWER' });
  });

  it('rebaixa para VIEWER um usuário com acesso expirado', async () => {
    findUnique.mockResolvedValue({ role: 'USER', active: true, accessExpiresAt: new Date(Date.now() - 1000) });
    const headers = new Headers({ cookie: await sessionCookie('authjs.session-token'), host: 'localhost:3100', 'x-forwarded-proto': 'http' });
    await expect(getAuthenticatedUser(headers)).resolves.toMatchObject({ role: 'VIEWER' });
  });

  it('rebaixa para VIEWER um usuário excluído', async () => {
    findUnique.mockResolvedValue(null);
    const headers = new Headers({ cookie: await sessionCookie('authjs.session-token'), host: 'localhost:3100', 'x-forwarded-proto': 'http' });
    await expect(getAuthenticatedUser(headers)).resolves.toMatchObject({ role: 'VIEWER' });
  });
});
