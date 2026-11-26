import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath }));

const { requireActionUser } = vi.hoisted(() => ({ requireActionUser: vi.fn() }));
vi.mock('../session', () => {
  class ActionAuthError extends Error {}
  return { ActionAuthError, requireActionUser };
});

const athletes = vi.hoisted(() => ({
  createAthlete: vi.fn(), updateAthlete: vi.fn(), deactivateAthlete: vi.fn(), saveAthleteNote: vi.fn(), findDuplicateAthletes: vi.fn(),
}));
vi.mock('../services/commands/athletes', () => athletes);
const arenas = vi.hoisted(() => ({ createArena: vi.fn(), updateArena: vi.fn(), deactivateArena: vi.fn() }));
vi.mock('../services/commands/arenas', () => arenas);
const events = vi.hoisted(() => ({ createEvent: vi.fn(), updateEvent: vi.fn(), cancelEvent: vi.fn() }));
vi.mock('../services/commands/events', () => events);
const { listMunicipalities } = vi.hoisted(() => ({ listMunicipalities: vi.fn() }));
vi.mock('../services/localities', () => ({ listMunicipalities }));

const a = await import('./athletes');
const ar = await import('./arenas');
const ev = await import('./events');

const user = { id: 'u1', role: 'USER' };
const athleteInput = { name: 'Zé', headHandicap: '2,5', heelHandicap: 3, cityCode: '5204409', nickname: 'Zeca' };
const dbAthlete = {
  id: 'a1', registrationNo: null, name: 'Zé', nickname: 'Zeca', club: null, city: 'Caiapônia', state: 'GO', cityCode: 5204409,
  headHandicap: { toString: () => '2.5' }, heelHandicap: { toString: () => '3' }, ownerId: 'u1',
};

beforeEach(() => {
  vi.clearAllMocks();
  requireActionUser.mockResolvedValue(user);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('atletas', () => {
  it('createAthleteAction devolve o Competitor mapeado e revalida /atletas, / e /sorteio-avulso', async () => {
    athletes.createAthlete.mockResolvedValue(dbAthlete);
    const result = await a.createAthleteAction(athleteInput);
    expect(athletes.createAthlete).toHaveBeenCalledWith(user, expect.objectContaining({ name: 'Zé', headHandicap: 2.5, heelHandicap: 3, cityCode: 5204409 }));
    expect(result).toMatchObject({ ok: true, data: { id: 'a1', nome: 'Zé', apelido: 'Zeca', estado: 'GO', cityNeedsReview: false, headHandicap: 2.5 } });
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/atletas', '/', '/sorteio-avulso']);
  });

  it('ignora ownerId enviado', async () => {
    athletes.createAthlete.mockResolvedValue(dbAthlete);
    await a.createAthleteAction({ ...athleteInput, ownerId: 'outro' } as never);
    expect(athletes.createAthlete.mock.calls[0][1]).not.toHaveProperty('ownerId');
  });

  it('input inválido não chama o command', async () => {
    const result = await a.createAthleteAction({ ...athleteInput, name: 'Z' });
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: ['Informe o nome com pelo menos 2 letras.'] } });
    expect(athletes.createAthlete).not.toHaveBeenCalled();
  });

  it('createAthleteAction com só heelHandicap manda headHandicap null', async () => {
    athletes.createAthlete.mockResolvedValue(dbAthlete);
    await a.createAthleteAction({ ...athleteInput, headHandicap: '', heelHandicap: '2' });
    expect(athletes.createAthlete).toHaveBeenCalledWith(user, expect.objectContaining({ headHandicap: null, heelHandicap: 2 }));
  });

  it('createAthleteAction com cidade não informada zera a cidade e não repassa cityUnknown', async () => {
    athletes.createAthlete.mockResolvedValue(dbAthlete);
    await a.createAthleteAction({ ...athleteInput, cityUnknown: true, cityCode: '' });
    const payload = athletes.createAthlete.mock.calls[0][1];
    expect(payload).toMatchObject({ cityCode: null, city: null, state: null });
    expect(payload).not.toHaveProperty('cityUnknown');
  });

  it('updateAthleteAction limpa handicap vazio e cidade não informada', async () => {
    athletes.updateAthlete.mockResolvedValue(dbAthlete);
    await a.updateAthleteAction('a1', { ...athleteInput, headHandicap: '', cityUnknown: true, cityCode: '' });
    expect(athletes.updateAthlete).toHaveBeenCalledWith(
      user, 'a1', expect.objectContaining({ headHandicap: null, heelHandicap: 3, cityCode: null, city: null, state: null }),
    );
    expect(athletes.updateAthlete.mock.calls[0][2]).not.toHaveProperty('cityUnknown');
  });

  it('resposta com handicap nulo do banco não quebra', async () => {
    athletes.createAthlete.mockResolvedValue({ ...dbAthlete, headHandicap: null });
    const result = await a.createAthleteAction(athleteInput);
    expect(result).toMatchObject({ ok: true, data: { heelHandicap: 3, headHandicap: undefined, handicap: 0 } });
  });

  it('updateAthleteAction passa o id separado dos dados', async () => {
    athletes.updateAthlete.mockResolvedValue(dbAthlete);
    await a.updateAthleteAction('a1', athleteInput);
    expect(athletes.updateAthlete).toHaveBeenCalledWith(user, 'a1', expect.not.objectContaining({ id: expect.anything() }));
  });

  it('updateAthleteAction envia null para apelido e clube em branco (limpar)', async () => {
    athletes.updateAthlete.mockResolvedValue(dbAthlete);
    await a.updateAthleteAction('a1', { ...athleteInput, nickname: '', club: '  ' });
    expect(athletes.updateAthlete).toHaveBeenCalledWith(user, 'a1', expect.objectContaining({ nickname: null, club: null }));
  });

  it('deactivateAthleteAction valida o id e revalida', async () => {
    expect(await a.deactivateAthleteAction('')).toMatchObject({ ok: false });
    expect(await a.deactivateAthleteAction('a1')).toEqual({ ok: true, data: null });
    expect(athletes.deactivateAthlete).toHaveBeenCalledWith(user, 'a1');
    expect(revalidatePath).toHaveBeenCalledTimes(3);
  });

  it('saveAthleteNoteAction aceita nota vazia e revalida só /atletas', async () => {
    expect(await a.saveAthleteNoteAction('a1', { body: '' })).toEqual({ ok: true, data: null });
    expect(athletes.saveAthleteNote).toHaveBeenCalledWith(user, 'a1', '');
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/atletas']);
  });

  it('checkAthleteDuplicatesAction não revalida', async () => {
    athletes.findDuplicateAthletes.mockResolvedValue([{ id: 'a9' }]);
    expect(await a.checkAthleteDuplicatesAction({ name: 'Zé', cityCode: 1 })).toEqual({ ok: true, data: [{ id: 'a9' }] });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('arenas', () => {
  it('createArenaAction cria e revalida /provas', async () => {
    arenas.createArena.mockResolvedValue({ created: true, arena: { id: 'r1', name: 'Lagoa', city: 'Caiapônia', state: 'GO', cityCode: 5204409, ownerId: 'u1' } });
    expect(await ar.createArenaAction({ name: 'Lagoa', cityCode: 5204409 })).toMatchObject({ ok: true, data: { id: 'r1', cityCode: 5204409 } });
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/provas']);
  });

  it('createArenaAction com arena existente devolve erro no campo name', async () => {
    arenas.createArena.mockResolvedValue({ created: false, arena: { id: 'r1' } });
    const message = 'Já existe uma arena com esse nome nessa cidade.';
    expect(await ar.createArenaAction({ name: 'Lagoa', cityCode: 1 })).toEqual({ ok: false, message, fieldErrors: { name: [message] } });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('listMunicipalitiesAction valida a UF e não revalida', async () => {
    listMunicipalities.mockResolvedValue([{ code: 1, name: 'X' }]);
    expect(await ar.listMunicipalitiesAction('go')).toMatchObject({ ok: false });
    expect(await ar.listMunicipalitiesAction('GO')).toEqual({ ok: true, data: [{ code: 1, name: 'X' }] });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('updateArenaAction e deactivateArenaAction revalidam /provas', async () => {
    arenas.updateArena.mockResolvedValue({ id: 'r1', name: 'N', city: 'C', state: 'GO', cityCode: 1 });
    expect(await ar.updateArenaAction('r1', { name: 'Nova', cityCode: 1 })).toMatchObject({ ok: true });
    expect(arenas.updateArena).toHaveBeenCalledWith(user, 'r1', { name: 'Nova', cityCode: 1 });
    expect(await ar.deactivateArenaAction('r1')).toEqual({ ok: true, data: null });
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/provas', '/provas']);
  });
});

describe('provas', () => {
  it('createEventAction converte a data para meio-dia UTC e cria a arena nova', async () => {
    events.createEvent.mockResolvedValue({ id: 'e1' });
    const result = await ev.createEventAction({ name: 'Copa', eventDate: '2026-12-05', arenaName: 'Lagoa', cityCode: '5204409' });
    expect(result).toEqual({ ok: true, data: { id: 'e1' } });
    expect(events.createEvent).toHaveBeenCalledWith(user, {
      name: 'Copa', eventDate: new Date('2026-12-05T12:00:00.000Z'), newArena: { name: 'Lagoa', cityCode: 5204409 },
    });
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/provas', '/agenda', '/']);
  });

  it('createEventAction com arenaId não envia newArena', async () => {
    events.createEvent.mockResolvedValue({ id: 'e1' });
    await ev.createEventAction({ name: 'Copa', eventDate: '2026-12-05', arenaId: 'r1' });
    const arg = events.createEvent.mock.calls[0][1];
    expect(arg.arenaId).toBe('r1');
    expect(arg).not.toHaveProperty('newArena');
  });

  it('updateEventAction devolve o resumo e revalida o layout da prova', async () => {
    events.updateEvent.mockResolvedValue({
      id: 'e1', name: 'Copa', eventDate: new Date('2026-12-05T12:00:00Z'), status: 'OPEN', arena: { name: 'L' },
      createdBy: { id: 'u1', name: 'Ana', email: 'a@b.c' }, _count: { registrations: 0, draws: 0 },
    });
    const result = await ev.updateEventAction('e1', { name: 'Copa', eventDate: '2026-12-05' });
    expect(result).toMatchObject({ ok: true, data: { id: 'e1', isoDate: '2026-12-05' } });
    expect(events.updateEvent).toHaveBeenCalledWith(user, 'e1', { name: 'Copa', eventDate: new Date('2026-12-05T12:00:00.000Z') });
    expect(revalidatePath).toHaveBeenCalledWith('/provas/e1', 'layout');
  });

  it('cancelEventAction revalida o layout da prova', async () => {
    expect(await ev.cancelEventAction('e1')).toEqual({ ok: true, data: null });
    expect(events.cancelEvent).toHaveBeenCalledWith(user, 'e1');
    expect(revalidatePath.mock.calls).toEqual([['/provas'], ['/agenda'], ['/'], ['/provas/e1', 'layout']]);
  });
});
