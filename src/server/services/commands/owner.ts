import type { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { isAdmin, isManager } from '../../permissions';
import { DomainError } from '../errors';
import { findMunicipality } from '../localities';

// Sem 'server-only': os handlers do Pages API importam estes commands.

export type ScopeUser = { id: string; role: string };
export type Db = Prisma.TransactionClient | typeof prisma;

/** Só gerentes escolhem o proprietário de um cadastro. */
export const canAssignOwner = (user: ScopeUser) => isAdmin(user.role) || isManager(user.role);

/** User cria sempre para si; gerente pode indicar outro dono, que precisa ser um usuário ativo. */
export async function resolveOwnerId(user: ScopeUser, requested?: string, db: Db = prisma): Promise<string> {
  if (!canAssignOwner(user) || !requested) return user.id;
  const owner = await db.user.findFirst({ where: { id: requested, active: true }, select: { id: true } });
  if (!owner) throw new DomainError('Proprietário inválido.', { field: 'ownerId' });
  return owner.id;
}

/** Com cityCode, cidade e UF vêm do município; sem ele, mantém o texto legado e deixa o código nulo. */
export async function resolveCity(input: {
  cityCode?: number | null;
  city?: string | null;
  state?: string | null;
}): Promise<{ cityCode: number | null; city: string | null; state: string | null }> {
  if (input.cityCode != null) {
    const municipality = await findMunicipality(input.cityCode);
    if (!municipality) throw new DomainError('Escolha uma cidade da lista.', { field: 'cityCode' });
    return { cityCode: municipality.code, city: municipality.name, state: municipality.uf };
  }
  return { cityCode: null, city: input.city || null, state: input.state || null };
}

export const FORBIDDEN_MESSAGE = 'Só o proprietário ou um gerente pode alterar este cadastro.';
