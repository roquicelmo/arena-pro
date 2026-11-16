'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Gravações de tempo ainda em andamento (inclusive as disparadas ao sair da pista). */
const inflightSaves = new Set<Promise<unknown>>();

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
export function useFreshServerData() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    void Promise.allSettled([...inflightSaves]).then(() => {
      if (active) router.refresh();
    });
    return () => {
      active = false;
    };
  }, [router]);
}
