'use client';

import React, { startTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, EmptyState } from '../ui';

export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // reset() sozinho só re-renderiza com o payload em cache; refresh busca os dados de novo.
  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 lg:px-8">
      <EmptyState
        title="Algo deu errado"
        description="Não foi possível carregar esta página. Tente novamente."
        action={<Button onClick={retry}>Tentar novamente</Button>}
      />
    </main>
  );
}
