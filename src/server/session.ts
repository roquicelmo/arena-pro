import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUser, type AuthenticatedUser } from './auth';
import { OPERATOR_ROLES } from './permissions';
import { prisma } from './prisma';

/** Usuário da requisição atual (deduplicado por requisição). */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  return getAuthenticatedUser(new Headers(await headers()));
});

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

/** Usuário atual com nome (consulta mínima), deduplicado por requisição. */
export const getCurrentUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  return { id: user.id, name: account?.name ?? null, email: user.email ?? '', role: user.role };
});

/** Para Server Components/páginas: sem sessão, redireciona para o login. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Para páginas restritas a papéis. Papel não permitido responde 404
 * (mesmo comportamento da API, para não revelar a existência do recurso).
 * `forbidden()` exigiria `experimental.authInterrupts`; preferimos notFound().
 */
export async function requireRole(roles: readonly string[]): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) notFound();
  return user;
}

export class ActionAuthError extends Error {
  readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN';

  constructor(message = 'Você não tem permissão para esta ação.', code: 'UNAUTHENTICATED' | 'FORBIDDEN' = 'FORBIDDEN') {
    super(message);
    this.name = 'ActionAuthError';
    this.code = code;
  }
}

/** Para Server Actions: lança em vez de redirecionar, para virar mensagem de erro. */
export async function requireActionUser(roles: readonly string[] = OPERATOR_ROLES): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new ActionAuthError('Sua sessão expirou. Entre novamente.', 'UNAUTHENTICATED');
  if (!roles.includes(user.role)) throw new ActionAuthError();
  return user;
}
