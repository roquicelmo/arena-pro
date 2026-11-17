import Link from 'next/link';
import type { Run } from '../../types/roping';
import { currentRunId, isRunDone, trackStats } from '../../lib/currentRun';
import { StatTile } from '../ui';

const hc = (n: number) => n.toFixed(1).replace('.', ',');
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2).replace('.', ','));

function Pair({ run, size = 'sm' }: { run: Run; size?: 'sm' | 'lg' }) {
  const name = size === 'lg' ? 'font-display text-3xl font-bold uppercase leading-tight sm:text-5xl' : 'font-semibold';
  return (
    <span className="min-w-0">
      <span className={`block truncate text-ink-strong ${name}`}>{run.cabeceiro.nome} <span className="text-base font-normal text-ink-muted">{hc(run.cabeceiro.handicap)}</span></span>
      <span className={`block truncate text-ink-strong ${name}`}>{run.pezeiro.nome} <span className="text-base font-normal text-ink-muted">{hc(run.pezeiro.handicap)}</span></span>
    </span>
  );
}

/** Tela do locutor: corrida atual em destaque, próximas e últimas (spec 6.7). */
export function AnnouncerBoard({ eventId, runs }: { eventId: string; runs: Run[] }) {
  const sorted = [...runs].sort((a, b) => a.numero - b.numero);
  const currentId = currentRunId(sorted);
  const index = sorted.findIndex((r) => r.id === currentId);
  const current = index >= 0 ? sorted[index] : null;
  const upcoming = index >= 0 ? sorted.slice(index + 1, index + 6) : [];
  const done = sorted.filter(isRunDone).slice(-5).reverse();
  const stats = trackStats(sorted);

  return (
    <div className="grid gap-4">
      <section aria-label="Corrida atual" aria-live="polite" aria-atomic="true" className="rounded-ui border-2 border-ink-strong bg-highlight p-5">
        {current ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <p className="font-display text-sm font-bold uppercase tracking-widest text-accent-ink">Corrida atual</p>
              <p className="font-display text-7xl font-bold leading-none text-ink-strong">{current.numero}</p>
              <p className="text-sm text-ink-muted">Bateria {current.bateria} · {current.cruzamento} · {current.bois} {current.bois === 1 ? 'boi' : 'bois'}</p>
            </div>
            <Pair run={current} size="lg" />
          </div>
        ) : (
          <p className="font-display text-2xl font-bold uppercase text-ink-strong">Todas as corridas foram concluídas.</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Andamento">
        <StatTile label="Concluídas" value={stats.completed} hint={`de ${runs.length}`} />
        <StatTile label="NT" value={stats.nt} />
        <StatTile label="Restantes" value={stats.remaining} />
        <StatTile label="Melhor média" value={stats.best === null ? '—' : fmt(stats.best)} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-ui border border-line bg-surface" aria-label="Próximas corridas">
          <h2 className="border-b border-line px-4 py-2 font-display text-lg font-bold uppercase text-ink-strong">Próximas</h2>
          <ol className="divide-y divide-line">
            {upcoming.map((run) => (
              <li key={run.id} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 px-4 py-2">
                <span className="font-display text-2xl font-bold text-ink-strong">{run.numero}</span><Pair run={run} />
              </li>
            ))}
            {!upcoming.length && <li className="px-4 py-4 text-sm text-ink-muted">Sem próximas corridas.</li>}
          </ol>
        </section>
        <section className="min-w-0 rounded-ui border border-line bg-surface" aria-label="Últimas corridas">
          <h2 className="border-b border-line px-4 py-2 font-display text-lg font-bold uppercase text-ink-strong">Últimas</h2>
          <ol className="divide-y divide-line">
            {done.map((run) => (
              <li key={run.id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2">
                <span className="font-display text-2xl font-bold text-ink-strong">{run.numero}</span><Pair run={run} />
                <span className="text-right font-display text-xl font-bold tabular-nums text-accent-ink">{run.isNt ? 'NT' : fmt(run.mediaFinal)}</span>
              </li>
            ))}
            {!done.length && <li className="px-4 py-4 text-sm text-ink-muted">Nenhuma corrida concluída ainda.</li>}
          </ol>
        </section>
      </div>
      <p className="text-xs text-ink-muted">Atualiza sozinha a cada 3 segundos. <Link href={`/provas/${eventId}/pista`} className="underline">Abrir a pista</Link></p>
    </div>
  );
}
