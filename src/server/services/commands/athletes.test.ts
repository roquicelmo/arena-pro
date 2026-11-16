import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, findMunicipality } = vi.hoisted(() => ({
  prisma: {
    user: { findFirst: vi.fn() },
    athlete: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    athleteNote: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  },
  findMunicipality: vi.fn(),
}));
vi.mock('../../prisma', () => ({ prisma }));
vi.mock('../localities', () => ({ findMunicipality }));

import {
  createAthlete,
  deactivateAthlete,
  findDuplicateAthletes,
  getAthleteNotes,
  saveAthleteNote,
  updateAthlete,
} from './athletes';

const data = { name: 'João', headHandicap: 5, heelHandicap: 5 };
const user = { id: 'u1', role: 'USER' };
const denied = { status: 403, message: 'Só o proprietário ou um gerente pode alterar este cadastro.' };

beforeEach(() => {
  vi.resetAllMocks();
  prisma.athlete.create.mockResolvedValue({ id: 'a1' });
  prisma.athlete.update.mockResolvedValue({ id: 'a1' });
});

describe('createAthlete', () => {
  it('user cria sempre para si, mesmo pedindo outro dono', async () => {
    await createAthlete(user, { ...data, ownerId: 'u2' });
    expect(prisma.athlete.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: 'u1' }) }));
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('gerente com dono inexistente recebe erro no campo ownerId', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(createAthlete({ id: 'm1', role: 'MANAGER' }, { ...data, ownerId: 'x' })).rejects.toMatchObject({
      message: 'Proprietário inválido.',
      field: 'ownerId',
    });
    expect(prisma.athlete.create).not.toHaveBeenCalled();
  });

  it('com cityCode grava cidade e UF do município', async () => {
    findMunicipality.mockResolvedValue({ code: 123, name: 'Cidade Mock', uf: 'ZZ' });
    await createAthlete(user, { ...data, cityCode: 123 });
    expect(prisma.athlete.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cityCode: 123, city: 'Cidade Mock', state: 'ZZ' }) }),
    );
  });

  it('cityCode inexistente → erro no campo cityCode', async () => {
    findMunicipality.mockResolvedValue(null);
    await expect(createAthlete(user, { ...data, cityCode: 1 })).rejects.toMatchObject({
      message: 'Escolha uma cidade da lista.',
      field: 'cityCode',
    });
  });

  it('sem cityCode grava o texto legado e deixa cityCode nulo', async () => {
    await createAthlete(user, { ...data, city: 'Goiânia', state: 'GO' });
    expect(prisma.athlete.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cityCode: null, city: 'Goiânia', state: 'GO' }) }),
    );
  });
});

describe('updateAthlete / deactivateAthlete', () => {
  it('user não altera atleta de outro (404)', async () => {
    prisma.athlete.findFirst.mockResolvedValue(null);
    await expect(updateAthlete(user, 'a-do-u2', { name: 'Novo' })).rejects.toMatchObject({ status: 404, message: 'Atleta não encontrado.' });
    expect(prisma.athlete.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a-do-u2', active: true, OR: [{ ownerId: 'u1' }, { shares: { some: { userId: 'u1' } } }] } }),
    );
    expect(prisma.athlete.update).not.toHaveBeenCalled();
  });

  it('user não troca o dono ao editar', async () => {
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1', ownerId: 'u1' });
    await updateAthlete(user, 'a1', { name: 'Novo', ownerId: 'u2' });
    const call = prisma.athlete.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty('ownerId');
    expect(call.data.name).toBe('Novo');
  });

  it('gerente troca o dono (validado)', async () => {
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1', ownerId: 'u1' });
    prisma.user.findFirst.mockResolvedValue({ id: 'u2' });
    await updateAthlete({ id: 'm1', role: 'MANAGER' }, 'a1', { ownerId: 'u2' });
    expect(prisma.athlete.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: 'u2' }) }));
  });

  it('desativar marca active=false', async () => {
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1', ownerId: 'u1' });
    await deactivateAthlete(user, 'a1');
    expect(prisma.athlete.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { active: false } });
  });

  it('usuário com quem o atleta foi compartilhado não edita nem desativa (403)', async () => {
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1', ownerId: 'u2' });
    await expect(updateAthlete(user, 'a1', { name: 'Novo nome' })).rejects.toMatchObject(denied);
    await expect(deactivateAthlete(user, 'a1')).rejects.toMatchObject(denied);
    expect(prisma.athlete.update).not.toHaveBeenCalled();
  });
});

describe('notas privadas', () => {
  it('usuário compartilhado grava a própria nota', async () => {
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1', ownerId: 'u2' });
    await saveAthleteNote(user, 'a1', ' obs ');
    expect(prisma.athleteNote.upsert).toHaveBeenCalledWith({
      where: { athleteId_userId: { athleteId: 'a1', userId: 'u1' } },
      create: { athleteId: 'a1', userId: 'u1', body: 'obs' },
      update: { body: 'obs' },
    });
  });

  it('nota vazia apaga', async () => {
    prisma.athlete.findFirst.mockResolvedValue({ id: 'a1', ownerId: 'u2' });
    await saveAthleteNote(user, 'a1', '  ');
    expect(prisma.athleteNote.deleteMany).toHaveBeenCalledWith({ where: { athleteId: 'a1', userId: 'u1' } });
    expect(prisma.athleteNote.upsert).not.toHaveBeenCalled();
  });

  it('atleta fora do escopo → 404', async () => {
    prisma.athlete.findFirst.mockResolvedValue(null);
    await expect(saveAthleteNote(user, 'a9', 'x')).rejects.toMatchObject({ status: 404 });
  });

  it('lê só as notas do próprio usuário', async () => {
    prisma.athleteNote.findMany.mockResolvedValue([{ athleteId: 'a1', body: 'obs' }]);
    expect(await getAthleteNotes(user, ['a1', 'a2'])).toEqual({ a1: 'obs' });
    expect(prisma.athleteNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', athleteId: { in: ['a1', 'a2'] } } }),
    );
  });
});

describe('findDuplicateAthletes', () => {
  it('ignora acento e caixa e respeita o escopo', async () => {
    prisma.athlete.findMany.mockResolvedValue([
      { id: 'a9', name: 'JOÃO SILVA', club: 'Haras X', city: 'Caiapônia', state: 'GO', owner: { name: 'User A' } },
      { id: 'a8', name: 'João Silva', club: 'Outro', city: 'Caiapônia', state: 'GO', owner: null },
    ]);
    const found = await findDuplicateAthletes(user, { name: 'joao silva', cityCode: 1, club: 'haras x' });
    expect(found.map((a) => a.id)).toEqual(['a9']);
    expect(found[0].ownerName).toBe('User A');
    expect(prisma.athlete.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ active: true, cityCode: 1, OR: [{ ownerId: 'u1' }, { shares: { some: { userId: 'u1' } } }] }),
      }),
    );
  });
});
