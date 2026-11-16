import { Auth, type AuthConfig } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';

const ROLE_RECHECK_MS = 60_000;

/** Papel efetivo: usuários inativos, expirados ou excluídos viram VIEWER (sem acesso operacional). */
async function resolveRole(userId: string): Promise<string> {
  const accountUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, active: true, accessExpiresAt: true },
  });
  const isValid = accountUser?.active && (!accountUser.accessExpiresAt || accountUser.accessExpiresAt > new Date());
  return isValid ? accountUser.role : 'VIEWER';
}

export const authConfig: AuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.active || !user.passwordHash) return null;
        if (user.accessExpiresAt && user.accessExpiresAt <= new Date()) return null;
        if (!(await compare(password, user.passwordHash))) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return token;
      // Revalida no login e, depois, no máximo a cada ROLE_RECHECK_MS: bloqueio,
      // expiração ou exclusão passam a valer sem esperar o cookie expirar.
      const checkedAt = typeof token.checkedAt === 'number' ? token.checkedAt : 0;
      if (user?.id || Date.now() - checkedAt > ROLE_RECHECK_MS) {
        token.role = await resolveRole(userId);
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const sessionUser = session.user as typeof session.user & { id: string; role: string };
        sessionUser.id = token.sub;
        sessionUser.role = typeof token.role === 'string' ? token.role : 'VIEWER';
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
  basePath: '/api/auth',
  secret: (globalThis as typeof globalThis & { process?: { env?: { AUTH_SECRET?: string } } }).process?.env
    ?.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: '/login' },
};

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  role: string;
}

export const getAuthenticatedUser = async (headers: Headers): Promise<AuthenticatedUser | null> => {
  // O protocolo define o nome do cookie que o Auth.js procura:
  // https → `__Secure-authjs.session-token`; http (localhost) → `authjs.session-token`.
  const protocol = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'http' ? 'http' : 'https';
  const host = headers.get('host') ?? 'localhost';
  const request = new Request(`${protocol}://${host}/api/auth/session`, { headers });
  const response = await Auth(request, authConfig);
  if (!response.ok) return null;

  const session = (await response.json()) as {
    user?: { id?: string; email?: string | null; role?: string };
  };
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role ?? 'VIEWER',
  };
};
