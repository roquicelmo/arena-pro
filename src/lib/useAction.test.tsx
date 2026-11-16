// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ActionResult } from './actionResult';

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('sonner', () => ({ toast, Toaster: () => null }));
const { redirectToLogin } = vi.hoisted(() => ({ redirectToLogin: vi.fn() }));
vi.mock('./apiClient', () => ({ redirectToLogin }));

const { useAction } = await import('./useAction');

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const formFailure: ActionResult<string> = {
  ok: false,
  message: 'Revise os campos destacados.',
  fieldErrors: { name: ['Nome curto.'] },
};

beforeEach(() => vi.clearAllMocks());

describe('useAction', () => {
  it('segunda chamada enquanto pendente é ignorada', async () => {
    const gate = deferred<ActionResult<string>>();
    const action = vi.fn(() => gate.promise);
    const { result } = renderHook(() => useAction(action));

    let first!: Promise<ActionResult<string> | null>;
    let second: ActionResult<string> | null | undefined;
    await act(async () => {
      first = result.current.execute({});
      second = await result.current.execute({});
    });
    expect(second).toBeNull();
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);

    await act(async () => {
      gate.resolve({ ok: true, data: 'ok' });
      await first;
    });
    expect(result.current.pending).toBe(false);
  });

  it('falha de formulário guarda message e fieldErrors sem toast', async () => {
    const { result } = renderHook(() => useAction(async () => formFailure));
    await act(async () => {
      await result.current.execute({});
    });
    expect(result.current.message).toBe('Revise os campos destacados.');
    expect(result.current.fieldErrors.name).toEqual(['Nome curto.']);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('toastErrors: true mostra toast.error', async () => {
    const { result } = renderHook(() => useAction(async () => formFailure, { toastErrors: true }));
    await act(async () => {
      await result.current.execute({});
    });
    expect(toast.error).toHaveBeenCalledWith('Revise os campos destacados.');
  });

  it('UNAUTHENTICATED mostra toast e chama redirectToLogin', async () => {
    const { result } = renderHook(() =>
      useAction(async (): Promise<ActionResult<string>> => ({
        ok: false,
        code: 'UNAUTHENTICATED',
        message: 'Sua sessão expirou. Entre novamente.',
      })),
    );
    await act(async () => {
      await result.current.execute({});
    });
    expect(toast.error).toHaveBeenCalledWith('Sua sessão expirou. Entre novamente.');
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it('sucesso mostra successMessage e limpa erros anteriores', async () => {
    const action = vi.fn<() => Promise<ActionResult<string>>>().mockResolvedValueOnce(formFailure);
    const { result } = renderHook(() => useAction(action, { successMessage: (data) => `Salvo ${data}` }));
    await act(async () => {
      await result.current.execute({});
    });
    expect(result.current.message).not.toBeNull();

    action.mockResolvedValueOnce({ ok: true, data: 'Zé' });
    await act(async () => {
      await result.current.execute({});
    });
    expect(toast.success).toHaveBeenCalledWith('Salvo Zé');
    expect(result.current.message).toBeNull();
    expect(result.current.fieldErrors).toEqual({});
  });

  it('successMessage em string é usada como está', async () => {
    const { result } = renderHook(() => useAction(async () => ({ ok: true as const, data: 1 }), { successMessage: 'Atleta salvo.' }));
    await act(async () => {
      await result.current.execute({});
    });
    expect(toast.success).toHaveBeenCalledWith('Atleta salvo.');
  });

  it("action que rejeita (rede) vira message 'Sem conexão com o servidor. Tente novamente.'", async () => {
    const { result } = renderHook(() =>
      useAction(async (): Promise<ActionResult<string>> => {
        throw new Error('fetch failed');
      }),
    );
    let returned: ActionResult<string> | null = null;
    await act(async () => {
      returned = await result.current.execute({});
    });
    expect(result.current.message).toBe('Sem conexão com o servidor. Tente novamente.');
    expect(result.current.pending).toBe(false);
    expect(returned).toEqual({ ok: false, message: 'Sem conexão com o servidor. Tente novamente.' });
  });

  it('reset limpa message e fieldErrors', async () => {
    const { result } = renderHook(() => useAction(async () => formFailure));
    await act(async () => {
      await result.current.execute({});
    });
    act(() => result.current.reset());
    expect(result.current.message).toBeNull();
    expect(result.current.fieldErrors).toEqual({});
  });
});
