import type { Run } from '../../types/roping';

const hc = (value: number) => value.toFixed(1).replace('.', ',');

/** Corridas sorteadas, só leitura, agrupadas por bateria (prova e sorteio avulso). */
export function DrawReview({ runs }: { runs: Run[] }) {
  const batteries = new Map<number, Run[]>();
  for (const run of runs) batteries.set(run.bateria, [...(batteries.get(run.bateria) ?? []), run]);
  return (
    <div className="grid gap-4">
      {[...batteries.entries()].map(([battery, items]) => {
        const crosses = [...new Set(items.map((r) => r.cruzamento))];
        return (
          <section key={battery} className="overflow-hidden rounded-ui border border-line bg-surface" aria-label={`Bateria ${battery}`}>
            <h3 className="bg-nav px-4 py-2 font-display text-base font-bold uppercase tracking-wide text-ink-strong">
              Bateria {battery}{crosses.length === 1 ? ` · ${crosses[0]}` : ''} · Corridas {items[0].numero}–{items[items.length - 1].numero}
            </h3>
            <ol className="divide-y divide-line">
              {items.map((run) => (
                <li key={run.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 px-4 py-2 text-sm sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_5rem_4rem]">
                  <span className="font-display text-lg font-bold text-ink-strong">{run.numero}</span>
                  <span className="truncate text-ink-strong">{run.cabeceiro.nome} <span className="text-ink-muted">({hc(run.cabeceiro.handicap)})</span></span>
                  <span className="col-start-2 truncate text-ink-strong sm:col-start-auto">{run.pezeiro.nome} <span className="text-ink-muted">({hc(run.pezeiro.handicap)})</span></span>
                  <span className="col-start-2 text-ink-muted sm:col-start-auto">SHC {hc(run.shc)}</span>
                  <span className="col-start-2 text-ink-muted sm:col-start-auto">{run.bois} {run.bois === 1 ? 'boi' : 'bois'}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
