import { Skeleton } from '../../../../src/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-16" />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="hidden h-72 xl:block" />
      </div>
    </main>
  );
}
