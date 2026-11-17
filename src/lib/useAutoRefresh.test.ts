// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoRefresh } from './useAutoRefresh';

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useAutoRefresh', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('atualiza a cada 3 s, pausa com a aba oculta e atualiza ao voltar', () => {
    const refresh = vi.fn();
    renderHook(() => useAutoRefresh(refresh));
    vi.advanceTimersByTime(9000);
    expect(refresh).toHaveBeenCalledTimes(3);
    setHidden(true);
    vi.advanceTimersByTime(9000);
    expect(refresh).toHaveBeenCalledTimes(3);
    setHidden(false);
    expect(refresh).toHaveBeenCalledTimes(4);
    vi.advanceTimersByTime(3000);
    expect(refresh).toHaveBeenCalledTimes(5);
  });
});
