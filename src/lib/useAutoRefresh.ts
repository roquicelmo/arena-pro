'use client';

import { useEffect } from 'react';

/**
 * Chama `refresh` a cada `intervalMs` enquanto a aba está visível e logo ao voltar
 * a ela (spec 6.7: locução quase em tempo real, sem SSE). Aba oculta = sem polling.
 */
export function useAutoRefresh(refresh: () => void, intervalMs = 3000) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(refresh, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        refresh();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh, intervalMs]);
}
