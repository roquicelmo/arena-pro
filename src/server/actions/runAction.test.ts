import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath }));

const { requireActionUser } = vi.hoisted(() => ({ requireActionUser: vi.fn() }));
vi.mock('../session', () => {
  class ActionAuthError extends Error {
    code: 'UNAUTHENTICATED' | 'FORBIDDEN';
    constructor(message = 'Você não tem permissão para esta ação.', code: 'UNAUTHENTICATED' | 'FORBIDDEN' = 'FORBIDDEN') {
      super(message);
      this.code = code;
    }
  }
  return { ActionAuthError, requireActionUser };
});

const { runAction } = await import('./runAction');
const { ActionAuthError } = await import('../session');
const { DomainError, notFound } = await import('../services/errors');

const schema = z.object({ name: z.string().min(2, 'Nome curto.') });

beforeEach(() => {
  vi.clearAllMocks();
  requireActionUser.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('runAction', () => {
  it('sem sessão devolve UNAUTHENTICATED e não chama o handler', async () => {
    requireActionUser.mockRejectedValue(new ActionAuthError('Sua sessão expirou. Entre novamente.', 'UNAUTHENTICATED'));
    const handler = vi.fn();
    expect(await runAction({ schema, input: { name: 'Zé' }, revalidate: ['/atletas'] }, handler))
      .toEqual({ ok: false, code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente.' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('papel não permitido devolve só a mensagem, sem code', async () => {
    requireActionUser.mockRejectedValue(new ActionAuthError());
    expect(await runAction({ schema, input: { name: 'Zé' }, revalidate: [] }, vi.fn()))
      .toEqual({ ok: false, message: 'Você não tem permissão para esta ação.' });
  });

  it('repassa os papéis a requireActionUser', async () => {
    await runAction({ schema, input: { name: 'Zé' }, revalidate: [], roles: ['ADMIN'] }, async () => 1);
    expect(requireActionUser).toHaveBeenCalledWith(['ADMIN']);
  });

  it('entrada inválida devolve fieldErrors e não revalida', async () => {
    const handler = vi.fn();
    const result = await runAction({ schema, input: { name: 'Z' }, revalidate: ['/atletas'] }, handler);
    expect(result).toEqual({ ok: false, message: 'Revise os campos destacados.', fieldErrors: { name: ['Nome curto.'] } });
    expect(handler).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('DomainError com campo vira fieldErrors daquele campo', async () => {
    const result = await runAction({ schema, input: { name: 'Zé' }, revalidate: [] }, async () => {
      throw new DomainError('Já existe.', { status: 409, field: 'name' });
    });
    expect(result).toEqual({ ok: false, message: 'Já existe.', fieldErrors: { name: ['Já existe.'] } });
  });

  it('DomainError sem campo vira só a mensagem e não revalida', async () => {
    const result = await runAction({ schema, input: { name: 'Zé' }, revalidate: ['/atletas'] }, async () => {
      throw notFound('Atleta');
    });
    expect(result).toEqual({ ok: false, message: 'Atleta não encontrado.' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('erro inesperado vira mensagem genérica', async () => {
    const result = await runAction({ schema, input: { name: 'Zé' }, revalidate: [] }, async () => {
      throw new Error('db down');
    });
    expect(result).toEqual({ ok: false, message: 'Não foi possível concluir a ação. Tente novamente.' });
    expect(console.error).toHaveBeenCalled();
  });

  it('sucesso revalida cada alvo e devolve os dados', async () => {
    const result = await runAction(
      { schema, input: { name: 'Zé' }, revalidate: ['/atletas', { path: '/provas/p1', type: 'layout' }] },
      async (_user, data) => data.name,
    );
    expect(result).toEqual({ ok: true, data: 'Zé' });
    expect(revalidatePath).toHaveBeenCalledWith('/atletas');
    expect(revalidatePath).toHaveBeenCalledWith('/provas/p1', 'layout');
  });

  it('revalidate pode depender dos dados devolvidos', async () => {
    await runAction({ schema, input: { name: 'Zé' }, revalidate: (id: string) => [`/atletas/${id}`] }, async () => 'a1');
    expect(revalidatePath).toHaveBeenCalledWith('/atletas/a1');
  });
});
