import { Skeleton } from '../../../src/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Skeleton className="h-[4.25rem] sm:w-80" />
          <Skeleton className="h-4 w-20 sm:ml-auto" />
        </div>
        <div className="overflow-hidden rounded-ui border border-line bg-surface">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_4.5rem_4.5rem_auto] md:items-center md:gap-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-8 md:w-[7.5rem]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
