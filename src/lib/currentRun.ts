import type { Run } from '../types/roping';

const done = (run: Run) => run.isNt || (run.totalTime !== null && run.totalTime !== undefined);

/** Corrida atual = a primeira (por número) sem total e sem NT (regra da locução). */
export function currentRunId(runs: Run[]): string | null {
  return [...runs].sort((a, b) => a.numero - b.numero).find((run) => !done(run))?.id ?? null;
}

/** Números da pista: concluídas (com média), NT, restantes e melhor média. */
export function trackStats(runs: Run[]) {
  const completed = runs.filter((r) => !r.isNt && r.mediaFinal !== null && r.mediaFinal !== undefined);
  const nt = runs.filter((r) => r.isNt).length;
  const best = completed.length ? Math.min(...completed.map((r) => r.mediaFinal as number)) : null;
  return { completed: completed.length, nt, remaining: runs.length - completed.length - nt, best };
}
