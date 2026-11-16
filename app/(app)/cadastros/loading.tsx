import { Skeleton } from '../../../src/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="mt-2 h-5 w-full max-w-xl" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-16 sm:w-64" />
        <Skeleton className="h-16 sm:w-80" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </main>
  );
}
