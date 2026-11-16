import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUser, type AuthenticatedUser } from './auth';
import { OPERATOR_ROLES } from './permissions';

/** Usuário da requisição atual (deduplicado por requisição). */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  return getAuthenticatedUser(new Headers(await headers()));
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
  constructor(message = 'Você não tem permissão para esta ação.') {
    super(message);
    this.name = 'ActionAuthError';
  }
}

/** Para Server Actions: lança em vez de redirecionar, para virar mensagem de erro. */
export async function requireActionUser(roles: readonly string[] = OPERATOR_ROLES): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new ActionAuthError('Sua sessão expirou. Entre novamente.');
  if (!roles.includes(user.role)) throw new ActionAuthError();
  return user;
}
