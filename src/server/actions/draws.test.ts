import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath }));
const { requireActionUser } = vi.hoisted(() => ({ requireActionUser: vi.fn() }));
vi.mock('../session', () => ({ ActionAuthError: class extends Error {}, requireActionUser }));
const draws = vi.hoisted(() => ({ generateDraw: vi.fn(), quickDraw: vi.fn() }));
vi.mock('../services/commands/draws', () => draws);
const regs = vi.hoisted(() => ({ registerAthlete: vi.fn(), cancelRegistration: vi.fn() }));
vi.mock('../services/commands/registrations', () => regs);

const actions = await import('./draws');
const user = { id: 'u1', role: 'USER' };
const config = { numGroups: 3, minGap: 5, balanceGroups: false };

beforeEach(() => {
  vi.clearAllMocks();
  requireActionUser.mockResolvedValue(user);
});

describe('actions de sorteio', () => {
  it('generateDrawAction repassa ao command e revalida o layout da prova', async () => {
    draws.generateDraw.mockResolvedValue({ drawId: 'd1', version: 2 });
    await expect(actions.generateDrawAction('e1', config)).resolves.toEqual({ ok: true, data: { drawId: 'd1', version: 2 } });
    expect(draws.generateDraw).toHaveBeenCalledWith(user, 'e1', config);
    expect(revalidatePath).toHaveBeenCalledWith('/provas/e1', 'layout');
  });

  it('configuração inválida volta como fieldErrors sem chamar o command', async () => {
    const result = await actions.generateDrawAction('e1', { ...config, numGroups: 9 });
    expect(result).toMatchObject({ ok: false });
    expect(draws.generateDraw).not.toHaveBeenCalled();
  });

  it('registerAthleteAction inscreve na categoria pedida', async () => {
    await expect(actions.registerAthleteAction('e1', { athleteId: 'a1', category: 'PEZEIRO' })).resolves.toEqual({ ok: true, data: null });
    expect(regs.registerAthlete).toHaveBeenCalledWith(user, 'e1', { athleteId: 'a1', category: 'PEZEIRO' });
  });

  it('quickDrawAction não revalida nada', async () => {
    draws.quickDraw.mockResolvedValue([]);
    await actions.quickDrawAction({ cabeceiroIds: ['c1'], pezeiroIds: ['p1'], config });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
