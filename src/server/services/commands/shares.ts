import { prisma } from '../../prisma';
import { MANAGER_ROLES, OPERATOR_ROLES } from '../../permissions';
import type { RecordType } from '../../../lib/schemas/shares';
import { DomainError } from '../errors';
import type { ScopeUser } from './owner';

// Sem 'server-only': segue o padrão dos demais commands.

const FORBIDDEN = 'Você não tem permissão para esta ação.';
const GONE = 'Algum cadastro selecionado não existe mais. Recarregue a página.';

function assertManager(user: ScopeUser) {
  if (!(MANAGER_ROLES as readonly string[]).includes(user.role)) throw new DomainError(FORBIDDEN, { status: 403 });
}

const unique = (values: string[]) => [...new Set(values)];

async function assertTargets(userIds: string[], field: 'userIds' | 'ownerId'): Promise<void> {
  const found = await prisma.user.findMany({
    where: { id: { in: userIds }, active: true, role: { in: [...OPERATOR_ROLES] } },
    select: { id: true },
  });
  if (found.length !== userIds.length) throw new DomainError('Usuário inválido.', { field });
}

async function loadRecords(type: RecordType, ids: string[]): Promise<Array<{ id: string; ownerId: string | null }>> {
  const args = { where: { id: { in: ids }, active: true }, select: { id: true, ownerId: true } };
  const records = type === 'athlete' ? await prisma.athlete.findMany(args) : await prisma.arena.findMany(args);
  if (records.length !== ids.length) throw new DomainError(GONE, { status: 404 });
  return records;
}

export async function shareRecords(
  user: ScopeUser,
  input: { type: RecordType; ids: string[]; userIds: string[] },
): Promise<{ added: number }> {
  assertManager(user);
  const ids = unique(input.ids);
  const userIds = unique(input.userIds);
  const records = await loadRecords(input.type, ids);
  await assertTargets(userIds, 'userIds');

  const pairs = records.flatMap((record) => userIds.filter((userId) => userId !== record.ownerId).map((userId) => ({ id: record.id, userId })));
  if (pairs.length === 0) return { added: 0 };
  const result =
    input.type === 'athlete'
      ? await prisma.athleteShare.createMany({ data: pairs.map(({ id, userId }) => ({ athleteId: id, userId })), skipDuplicates: true })
      : await prisma.arenaShare.createMany({ data: pairs.map(({ id, userId }) => ({ arenaId: id, userId })), skipDuplicates: true });
  return { added: result.count };
}

export async function unshareRecords(
  user: ScopeUser,
  input: { type: RecordType; ids: string[]; userIds: string[] },
): Promise<{ removed: number }> {
  assertManager(user);
  const ids = unique(input.ids);
  const userIds = unique(input.userIds);
  const result =
    input.type === 'athlete'
      ? await prisma.athleteShare.deleteMany({ where: { athleteId: { in: ids }, userId: { in: userIds } } })
      : await prisma.arenaShare.deleteMany({ where: { arenaId: { in: ids }, userId: { in: userIds } } });
  return { removed: result.count };
}

export async function reassignEvents(
  user: ScopeUser,
  input: { ids: string[]; ownerId: string },
): Promise<{ updated: number }> {
  assertManager(user);
  const ids = unique(input.ids);
  const events = await prisma.event.findMany({ where: { id: { in: ids }, status: { not: 'CANCELLED' } }, select: { id: true } });
  if (events.length !== ids.length) throw new DomainError(GONE, { status: 404 });
  await assertTargets([input.ownerId], 'ownerId');
  const result = await prisma.event.updateMany({ where: { id: { in: ids } }, data: { createdById: input.ownerId } });
  return { updated: result.count };
}
