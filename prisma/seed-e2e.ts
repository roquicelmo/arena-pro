import { assertTestDatabaseUrl } from '../scripts/assert-local-db.mjs';
import { PrismaClient, type UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { TEST_ARENAS, TEST_EVENTS, TEST_SHARED_ATHLETE, TEST_USERS } from '../e2e/fixtures/users';

const databaseUrl = process.env.DATABASE_URL;
try {
  // O PrismaClient do schema conecta em DATABASE_URL_POOLED; ambas precisam ser o banco local de testes.
  assertTestDatabaseUrl(databaseUrl);
  assertTestDatabaseUrl(process.env.DATABASE_URL_POOLED ?? databaseUrl);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

// Conecta explicitamente na URL validada, sem depender de DATABASE_URL_POOLED.
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

const ATHLETES_USER_A = [
  { name: 'CABECEIRO A1', head: 3.5, heel: 2, category: 'CABECEIRO' },
  { name: 'CABECEIRO A2', head: 2, heel: 1.5, category: 'CABECEIRO' },
  { name: 'CABECEIRO A3', head: 1, heel: 1, category: 'CABECEIRO' },
  { name: 'PEZEIRO A1', head: 1.5, heel: 3, category: 'PEZEIRO' },
  { name: 'PEZEIRO A2', head: 1, heel: 2, category: 'PEZEIRO' },
  { name: 'PEZEIRO A3', head: 1, heel: 1, category: 'PEZEIRO' },
] as const;

const ATHLETES_USER_B = [
  { name: 'CABECEIRO B1', head: 2, heel: 1, category: 'CABECEIRO' },
  { name: 'PEZEIRO B1', head: 1, heel: 2, category: 'PEZEIRO' },
] as const;

async function upsertUser(key: keyof typeof TEST_USERS) {
  const user = TEST_USERS[key];
  const passwordHash = await hash(user.password, 12);
  const data = { name: user.name, passwordHash, role: user.role as UserRole, active: key !== 'blocked', provisional: false };
  return prisma.user.upsert({ where: { email: user.email }, update: data, create: { email: user.email, ...data } });
}

async function resolveCityCode(name: string, uf: string) {
  const municipality = await prisma.municipality.findFirst({ where: { name, uf } });
  if (!municipality) throw new Error(`Município ${name}/${uf} não encontrado: a migration de localidades foi aplicada?`);
  return municipality.code;
}

async function seedOwner(
  ownerId: string,
  cityCode: number,
  arenaName: string,
  eventName: string,
  athletes: ReadonlyArray<{ name: string; head: number; heel: number; category: string }>,
) {
  const arena = await prisma.arena.create({ data: { name: arenaName, city: 'Lagoa da Prata', state: 'MG', cityCode, ownerId } });
  const event = await prisma.event.create({
    data: { name: eventName, eventDate: new Date(Date.UTC(2026, 11, 5, 12)), status: 'OPEN', arenaId: arena.id, createdById: ownerId },
  });
  for (const athlete of athletes) {
    const created = await prisma.athlete.create({
      data: { name: athlete.name, city: 'Lagoa da Prata', state: 'MG', cityCode, headHandicap: athlete.head, heelHandicap: athlete.heel, ownerId },
    });
    await prisma.eventRegistration.create({ data: { eventId: event.id, athleteId: created.id, category: athlete.category } });
  }
}

async function main() {
  await upsertUser('admin');
  await upsertUser('manager');
  const userA = await upsertUser('userA');
  const userB = await upsertUser('userB');
  await upsertUser('blocked');
  const cityCode = await resolveCityCode('Lagoa da Prata', 'MG');
  await seedOwner(userA.id, cityCode, TEST_ARENAS.userA, TEST_EVENTS.userA, ATHLETES_USER_A);
  await seedOwner(userB.id, cityCode, TEST_ARENAS.userB, TEST_EVENTS.userB, ATHLETES_USER_B);
  const shared = await prisma.athlete.findFirstOrThrow({ where: { name: TEST_SHARED_ATHLETE, ownerId: userB.id } });
  await prisma.athleteShare.create({ data: { athleteId: shared.id, userId: userA.id } });
  console.log('Seed de e2e concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
