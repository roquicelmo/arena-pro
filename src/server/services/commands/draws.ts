import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { toCompetitor } from '../../../lib/mappers';
import type { DrawConfig, Run } from '../../../types/roping';
import { calculateBois, executeGroupCrossDraw } from '../../../utils/drawAlgorithm';
import type { SumulaRun } from '../../../lib/sumula';
import { DomainError } from '../errors';
import { accessScope } from '../scope';
import type { ScopeUser } from './owner';
import { findScopedEvent } from './registrations';

// Sem 'server-only': os handlers do Pages API importam estes commands.

export type DrawLock = { locked: false } | { locked: true; reason: 'times' | 'published' };

export const DRAW_LOCK_MESSAGES = {
  times: 'Não é possível refazer: já há tempos lançados.',
  published: 'Não é possível refazer: o resultado já foi publicado.',
} as const;

type Db = Prisma.TransactionClient | typeof prisma;

const athleteSelect = { id: true, registrationNo: true, name: true, city: true, headHandicap: true, heelHandicap: true } as const;

async function lockFor(db: Db, event: { id: string; status: string; publishedAt: Date | null }): Promise<DrawLock> {
  if (event.status === 'FINISHED' || event.publishedAt) return { locked: true, reason: 'published' };
  const latest = await db.draw.findFirst({ where: { eventId: event.id }, orderBy: { version: 'desc' }, select: { id: true } });
  if (!latest) return { locked: false };
  const times = await db.runTime.count({ where: { run: { drawId: latest.id } } });
  return times > 0 ? { locked: true, reason: 'times' } : { locked: false };
}

/** Pode refazer o sorteio? Bloqueia depois do primeiro tempo lançado ou da publicação (spec 6.4). */
export async function getDrawLock(user: ScopeUser, eventId: string): Promise<DrawLock> {
  return lockFor(prisma, await findScopedEvent(user, eventId));
}

/**
 * Gera a próxima versão do sorteio a partir das inscrições ativas, tudo numa
 * transação: trava, versão, Draw + Runs e status DRAWN. A unicidade
 * (eventId, version) transforma a corrida entre dois cliques em 409.
 */
export async function generateDraw(user: ScopeUser, eventId: string, config: DrawConfig): Promise<{ drawId: string; version: number }> {
  const event = await findScopedEvent(user, eventId);
  try {
    return await prisma.$transaction(async (tx) => {
      const lock = await lockFor(tx, event);
      if (lock.locked) throw new DomainError(DRAW_LOCK_MESSAGES[lock.reason], { status: 409 });

      const registrations = await tx.eventRegistration.findMany({
        where: { eventId, status: 'ACTIVE', athlete: { active: true } },
        include: { athlete: { select: athleteSelect } },
      });
      const cabeceiros = registrations.filter((r) => r.category === 'CABECEIRO').map((r) => toCompetitor(r.athlete, 'head'));
      const pezeiros = registrations.filter((r) => r.category === 'PEZEIRO').map((r) => toCompetitor(r.athlete, 'heel'));
      if (!cabeceiros.length || !pezeiros.length) {
        throw new DomainError('A prova precisa de pelo menos um cabeceiro e um pezeiro ativo.', { status: 422 });
      }
      const { runs } = executeGroupCrossDraw(cabeceiros, pezeiros, config);
      if (!runs.length) throw new DomainError('Não foi possível gerar corridas válidas para estas inscrições.', { status: 422 });

      const latest = await tx.draw.findFirst({ where: { eventId }, orderBy: { version: 'desc' }, select: { version: true } });
      const version = (latest?.version ?? 0) + 1;
      const draw = await tx.draw.create({
        data: {
          eventId,
          version,
          status: 'GENERATED',
          configuration: config as unknown as Prisma.InputJsonValue,
          generatedById: user.id,
          generatedAt: new Date(),
          runs: {
            create: runs.map((run) => ({
              runNumber: run.numero,
              phase: run.fase,
              round: run.rodada,
              battery: run.bateria,
              headAthleteId: run.cabeceiro.id,
              heelAthleteId: run.pezeiro.id,
              headGroup: run.cabeceiroGrupo,
              heelGroup: run.pezeiroGrupo,
              combinedHandicap: run.shc,
              numberOfBulls: run.bois,
            })),
          },
        },
        select: { id: true, version: true },
      });
      await tx.event.update({ where: { id: eventId }, data: { status: 'DRAWN' } });
      return { drawId: draw.id, version: draw.version };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DomainError('Outro sorteio foi gerado ao mesmo tempo. Recarregue a página.', { status: 409 });
    }
    throw error;
  }
}

/** Sorteio avulso: nada é gravado; os atletas precisam estar no escopo do usuário (spec 6.8). */
export async function quickDraw(user: ScopeUser, input: { cabeceiroIds: string[]; pezeiroIds: string[]; config: DrawConfig }): Promise<Run[]> {
  const ids = [...new Set([...input.cabeceiroIds, ...input.pezeiroIds])];
  const athletes = await prisma.athlete.findMany({ where: { id: { in: ids }, active: true, ...accessScope(user) }, select: athleteSelect });
  const byId = new Map(athletes.map((a) => [a.id, a]));
  if (ids.some((id) => !byId.has(id))) throw new DomainError('Atleta não encontrado ou inativo.', { status: 404 });
  const cabeceiros = input.cabeceiroIds.map((id) => toCompetitor(byId.get(id)!, 'head'));
  const pezeiros = input.pezeiroIds.map((id) => toCompetitor(byId.get(id)!, 'heel'));
  const { runs } = executeGroupCrossDraw(cabeceiros, pezeiros, input.config);
  if (!runs.length) throw new DomainError('Não foi possível gerar corridas válidas com estes atletas.', { status: 422 });
  return runs;
}

/**
 * Corridas do PDF do sorteio avulso: confere que todos os atletas estão no escopo
 * do usuário e relê nomes e handicaps do banco (não confia no que veio da tela).
 */
export async function buildQuickSumula(
  user: ScopeUser,
  runs: Array<{ numero: number; bateria: number; cabeceiroId: string; pezeiroId: string; cabeceiroGrupo: string; pezeiroGrupo: string }>,
): Promise<SumulaRun[]> {
  if (runs.some((r) => r.cabeceiroId === r.pezeiroId)) throw new DomainError('Um atleta não pode fazer dupla consigo mesmo.', { status: 400 });
  const ids = [...new Set(runs.flatMap((r) => [r.cabeceiroId, r.pezeiroId]))];
  const athletes = await prisma.athlete.findMany({ where: { id: { in: ids }, active: true, ...accessScope(user) }, select: athleteSelect });
  const byId = new Map(athletes.map((a) => [a.id, a]));
  if (ids.some((id) => !byId.has(id))) throw new DomainError('Atleta não encontrado ou inativo.', { status: 404 });
  return runs.map((r) => {
    const cab = byId.get(r.cabeceiroId)!;
    const pe = byId.get(r.pezeiroId)!;
    const shc = Number((Number(cab.headHandicap) + Number(pe.heelHandicap)).toFixed(1));
    return {
      numero: r.numero,
      bateria: r.bateria,
      cabeceiro: { nome: cab.name, hc: Number(cab.headHandicap) },
      pezeiro: { nome: pe.name, hc: Number(pe.heelHandicap) },
      grupoCab: r.cabeceiroGrupo,
      grupoPe: r.pezeiroGrupo,
      shc,
      bois: calculateBois(shc),
    };
  });
}
