import React from 'react';
import { Skeleton } from '../ui';

/** `cards` = painel (3 indicadores + lista); `list` = título + linhas de lista. */
export function RouteSkeleton({ variant = 'cards' }: { variant?: 'cards' | 'list' }) {
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Carregando">
      <Skeleton className="mb-6 h-10 w-64" />
      {variant === 'cards' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="mt-6 h-64" />
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
    </main>
  );
}
