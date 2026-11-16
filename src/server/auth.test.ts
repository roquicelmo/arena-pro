import { beforeAll, describe, expect, it, vi } from 'vitest';
import { encode } from '@auth/core/jwt';

const SECRET = 'test-secret-for-unit-tests-only-0123456789';

vi.mock('./prisma', () => ({ prisma: {} }));

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
});
