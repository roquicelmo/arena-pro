'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Gravações de tempo ainda em andamento (inclusive as disparadas ao sair da pista). */
const inflightSaves = new Set<Promise<unknown>>();

/** Verdadeiro quando a montagem atual veio de voltar/avançar (popstate), consumido pelo hook. */
let cameFromHistory = false;
const HISTORY_DETECTION_MS = 50;
if (typeof window !== 'undefined') {
  // Captura: precisa rodar antes do handler do roteador, que já pode montar a tela de forma síncrona.
  window.addEventListener('popstate', () => {
    cameFromHistory = true;
  }, true);
}

export function trackSave<T>(promise: Promise<T>): Promise<T> {
  inflightSaves.add(promise);
  const done = () => inflightSaves.delete(promise);
  promise.then(done, done);
  return promise;
}

/**
 * Voltar/avançar reaproveita o payload RSC em cache, que pode ter tempos antigos.
 * Ao montar a tela, espera as gravações pendentes e busca os dados do servidor de novo.
 */
export function useFreshServerData(onRefresh?: () => void) {
  const router = useRouter();
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });
  useEffect(() => {
    let active = true;
    // O popstate chega logo depois da montagem (o roteador monta a tela antes de o evento
    // terminar de propagar), então a decisão espera um instante. Navegação por link já traz
    // dados novos; só voltar/avançar reaproveita o cache.
    const timer = setTimeout(() => {
      if (!cameFromHistory) return;
      cameFromHistory = false;
      void Promise.allSettled([...inflightSaves]).then(() => {
        if (!active) return;
        onRefreshRef.current?.();
        router.refresh();
      });
    }, HISTORY_DETECTION_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [router]);
}
