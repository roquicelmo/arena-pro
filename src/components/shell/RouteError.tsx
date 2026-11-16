'use client';

import React from 'react';
import { Button, EmptyState } from '../ui';

export function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 lg:px-8">
      <EmptyState
        title="Algo deu errado"
        description="Não foi possível carregar esta página. Tente novamente."
        action={<Button onClick={reset}>Tentar novamente</Button>}
      />
    </main>
  );
}
