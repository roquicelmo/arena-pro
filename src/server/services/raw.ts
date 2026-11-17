import { prisma } from '../prisma';
import { accessScope, eventScope } from './scope';

type ScopeUser = { id: string; role: string };

export const eventInclude = {
  arena: { select: { id: true, name: true, city: true, state: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { registrations: true, draws: true } },
} as const;

export const athleteSelect = { id: true, registrationNo: true, name: true, city: true, headHandicap: true, heelHandicap: true } as const;

const registrationInclude = {
  athlete: { select: { ...athleteSelect, state: true } },
} as const;

// Consultas brutas (formato Prisma) usadas pelos handlers de /api (pages router).
// Ficam sem 'server-only', que não carrega fora do bundle de Server Components.

/** Atletas ativos com dono, no formato bruto do Prisma (services de atletas e telas). */
export const findAthletesRaw = (user: ScopeUser, opts: { ownerId?: string } = {}) =>
  prisma.athlete.findMany({
    where: { active: true, ...accessScope(user, opts.ownerId) },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

/** Arenas ativas no formato bruto do Prisma (service de arenas). */
export const findArenasRaw = (user: ScopeUser, opts: { ownerId?: string } = {}) =>
  prisma.arena.findMany({
    where: { active: true, ...accessScope(user, opts.ownerId) },
    orderBy: [{ name: 'asc' }, { city: 'asc' }],
  });

/** Provas no formato bruto do Prisma (service de provas). */
export const findEventsRaw = (user: ScopeUser, opts: { ownerId?: string } = {}) => {
  const where = eventScope(user, opts.ownerId);
  return prisma.event.findMany({
    include: eventInclude,
    where: where.createdById ? where : undefined,
    orderBy: { eventDate: 'desc' },
  });
};

/** Usuários no formato bruto (página /usuarios, que exige MANAGER_ROLES). */
export const findUsersRaw = () =>
  prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, provisional: true, accessExpiresAt: true, lastLoginAt: true, createdAt: true, managedById: true },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

/** Sorteios da prova, mais recente primeiro, no formato bruto (services de sorteio). */
export const findDrawsRaw = (eventId: string, opts: { take?: number } = {}) =>
  prisma.draw.findMany({
    where: { eventId },
    include: {
      runs: {
        orderBy: { runNumber: 'asc' },
        include: {
          headAthlete: { select: athleteSelect },
          heelAthlete: { select: athleteSelect },
          times: { orderBy: { bullNumber: 'asc' } },
        },
      },
    },
    orderBy: { version: 'desc' },
    ...(opts.take ? { take: opts.take } : {}),
  });

/** Inscrições ativas no formato bruto (services de inscrições e sorteio). */
export const findRegistrationsRaw = (eventId: string) =>
  prisma.eventRegistration.findMany({
    where: { eventId, status: 'ACTIVE' },
    include: registrationInclude,
    orderBy: [{ category: 'asc' }, { athlete: { name: 'asc' } }],
  });
