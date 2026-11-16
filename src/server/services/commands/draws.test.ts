import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    draw: { findFirst: vi.fn(), create: vi.fn() },
    runTime: { count: vi.fn() },
    eventRegistration: { findMany: vi.fn() },
    event: { update: vi.fn() },
  };
  return {
    tx,
    prisma: {
      event: { findFirst: vi.fn() },
      athlete: { findFirst: vi.fn(), findMany: vi.fn() },
      draw: { findFirst: vi.fn() },
      runTime: { count: vi.fn() },
      eventRegistration: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});
vi.mock('../../prisma', () => ({ prisma }));

import { generateDraw, getDrawLock, quickDraw } from './draws';
import { registerAthlete } from './registrations';

const user = { id: 'u1', role: 'USER' };
const config = { numGroups: 2, minGap: 0, balanceGroups: false };
const athlete = (id: string) => ({ id, registrationNo: null, name: id, city: null, headHandicap: '2', heelHandicap: '2' });
const openEvent = { id: 'e1', createdById: 'u1', status: 'OPEN', publishedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.event.findFirst.mockResolvedValue(openEvent);
});

describe('registerAthlete', () => {
  it('não inscreve atleta fora do escopo do dono da prova (404)', async () => {
    prisma.athlete.findFirst.mockResolvedValue(null);
    await expect(registerAthlete(user, 'e1', { athleteId: 'a-do-b', category: 'PEZEIRO' })).rejects.toMatchObject({ status: 404, message: 'Atleta não encontrado ou inativo.' });
    expect(prisma.athlete.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'a-do-b', active: true, OR: [{ ownerId: 'u1' }, { shares: { some: { userId: 'u1' } } }] },
    }));
    expect(prisma.eventRegistration.create).not.toHaveBeenCalled();
  });

  it('usa o escopo do dono da prova, não o do gerente que inscreve', async () => {
    prisma.event.findFirst.mockResolvedValue({ ...openEvent, createdById: 'dono' });
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1' });
    prisma.eventRegistration.findUnique.mockResolvedValue(null);
    await registerAthlete({ id: 'm1', role: 'MANAGER' }, 'e1', { athleteId: 'a1', category: 'CABECEIRO' });
    expect(prisma.athlete.findFirst.mock.calls[0][0].where.OR).toEqual([{ ownerId: 'dono' }, { shares: { some: { userId: 'dono' } } }]);
    expect(prisma.eventRegistration.create).toHaveBeenCalled();
  });

  it('inscrição ativa repetida = 409', async () => {
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1' });
    prisma.eventRegistration.findUnique.mockResolvedValue({ id: 'r1', status: 'ACTIVE' });
    await expect(registerAthlete(user, 'e1', { athleteId: 'a1', category: 'CABECEIRO' })).rejects.toMatchObject({ status: 409 });
  });
});

describe('generateDraw', () => {
  const registrations = [
    { category: 'CABECEIRO', athlete: athlete('c1') }, { category: 'CABECEIRO', athlete: athlete('c2') },
    { category: 'PEZEIRO', athlete: athlete('p1') }, { category: 'PEZEIRO', athlete: athlete('p2') },
  ];

  it('recusa refazer depois de tempo lançado (409)', async () => {
    tx.draw.findFirst.mockResolvedValue({ id: 'd1', version: 1 });
    tx.runTime.count.mockResolvedValue(3);
    await expect(generateDraw(user, 'e1', config)).rejects.toMatchObject({ status: 409, message: 'Não é possível refazer: já há tempos lançados.' });
    expect(tx.draw.create).not.toHaveBeenCalled();
  });

  it('recusa refazer prova publicada', async () => {
    prisma.event.findFirst.mockResolvedValue({ ...openEvent, publishedAt: new Date() });
    await expect(generateDraw(user, 'e1', config)).rejects.toMatchObject({ message: 'Não é possível refazer: o resultado já foi publicado.' });
  });

  it('cria a versão seguinte dentro da transação e marca a prova como sorteada', async () => {
    tx.draw.findFirst.mockResolvedValueOnce({ id: 'd1', version: 2 }).mockResolvedValueOnce({ version: 2 });
    tx.runTime.count.mockResolvedValue(0);
    tx.eventRegistration.findMany.mockResolvedValue(registrations);
    tx.draw.create.mockResolvedValue({ id: 'd3', version: 3 });
    await expect(generateDraw(user, 'e1', config)).resolves.toEqual({ drawId: 'd3', version: 3 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.draw.create.mock.calls[0][0].data.version).toBe(3);
    expect(tx.event.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { status: 'DRAWN' } });
  });

  it('colisão de versão (P2002) vira 409 claro', async () => {
    prisma.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(generateDraw(user, 'e1', config)).rejects.toMatchObject({ status: 409, message: 'Outro sorteio foi gerado ao mesmo tempo. Recarregue a página.' });
  });

  it('getDrawLock sem sorteio = liberado', async () => {
    prisma.draw.findFirst.mockResolvedValue(null);
    await expect(getDrawLock(user, 'e1')).resolves.toEqual({ locked: false });
  });

  it('getDrawLock com tempo na versão atual = travado', async () => {
    prisma.draw.findFirst.mockResolvedValue({ id: 'd1' });
    prisma.runTime.count.mockResolvedValue(1);
    await expect(getDrawLock(user, 'e1')).resolves.toEqual({ locked: true, reason: 'times' });
  });
});

describe('quickDraw', () => {
  it('recusa atleta fora do escopo do usuário', async () => {
    prisma.athlete.findMany.mockResolvedValue([athlete('c1')]);
    await expect(quickDraw(user, { cabeceiroIds: ['c1'], pezeiroIds: ['p-do-b'], config })).rejects.toMatchObject({ status: 404 });
  });

  it('sorteia com os atletas do escopo sem gravar nada', async () => {
    prisma.athlete.findMany.mockResolvedValue([athlete('c1'), athlete('c2'), athlete('p1'), athlete('p2')]);
    const runs = await quickDraw(user, { cabeceiroIds: ['c1', 'c2'], pezeiroIds: ['p1', 'p2'], config });
    expect(runs.length).toBeGreaterThan(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
