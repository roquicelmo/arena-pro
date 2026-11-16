'use client';

import { Lock, Printer, Trophy } from 'lucide-react';
import type { EventSummary } from '../../types/events';
import type { Run } from '../../types/roping';
import { rankRuns } from '../../lib/ranking';
import { Badge, Button, cn } from '../ui';

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2).replace('.', ','));

interface Props {
  event: EventSummary;
  runs: Run[];
  published: boolean;
  publishing: boolean;
  onPublish: () => void;
}

/** Resultado: pódio, classificação por média, NT/incompletas e publicação (spec fase 4). */
export function ResultsBoard({ event, runs, published, publishing, onPublish }: Props) {
  const { ranked, eliminated, pending } = rankRuns(runs);
  const podium = ranked.slice(0, 3);
  const pair = (r: Run) => `${r.cabeceiro.nome} × ${r.pezeiro.nome}`;

  return (
    <div className="grid gap-4">
      <div className="print-header hidden print:block">
        <p className="font-display text-sm font-bold uppercase tracking-widest">Resultado final</p>
        <h1 className="font-display text-2xl font-bold uppercase">{event.name}</h1>
        <p className="text-sm">{event.date} · {event.arena}</p>
      </div>

      <div className="no-print flex flex-col gap-3 rounded-ui border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {published ? <Badge tone="success">Resultado publicado</Badge> : <Badge>Não publicado</Badge>}
          <span className="text-sm text-ink-muted">{ranked.length} classificadas · {eliminated.length} NT · {pending.length} incompletas</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!published && pending.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-ink-muted"><Lock className="h-4 w-4" aria-hidden="true" /> Finalize ou marque NT nas {pending.length} corridas incompletas para publicar.</span>
          )}
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Imprimir</Button>
          {!published && <Button loading={publishing} disabled={pending.length > 0} onClick={onPublish}>Publicar resultado</Button>}
        </div>
      </div>

      {podium.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Pódio">
          {podium.map((r, i) => (
            <div key={r.id} className={cn('rounded-ui border p-4', i === 0 ? 'border-ink-strong bg-highlight' : 'border-line bg-surface')}>
              <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-accent-ink"><Trophy className="h-4 w-4" aria-hidden="true" /> {i + 1}º lugar</p>
              <p className="mt-1 truncate font-semibold text-ink-strong">{pair(r)}</p>
              <p className="font-display text-3xl font-bold tabular-nums text-ink-strong">{fmt(r.mediaFinal)}</p>
              <p className="text-xs text-ink-muted">Corrida {r.numero} · total {fmt(r.totalTime)}</p>
            </div>
          ))}
        </section>
      )}

      <section className="min-w-0 overflow-hidden rounded-ui border border-line bg-surface" aria-label="Classificação">
        <h2 className="border-b border-line px-4 py-2 font-display text-lg font-bold uppercase text-ink-strong">Classificação</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">Pos.</th><th className="py-2">Dupla</th><th className="hidden py-2 sm:table-cell">Corrida</th><th className="py-2 text-right">Total</th><th className="px-4 py-2 text-right">Média</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ranked.map((r, i) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-display text-lg font-bold text-ink-strong">{i + 1}º</td>
                <td className="max-w-0 truncate py-2 text-ink-strong">{pair(r)}</td>
                <td className="hidden py-2 text-ink-muted sm:table-cell">{r.numero}</td>
                <td className="py-2 text-right tabular-nums">{fmt(r.totalTime)}</td>
                <td className="px-4 py-2 text-right font-display text-lg font-bold tabular-nums text-accent-ink">{fmt(r.mediaFinal)}</td>
              </tr>
            ))}
            {[...eliminated, ...pending].map((r) => (
              <tr key={r.id} className="text-ink-muted">
                <td className="px-4 py-2">—</td>
                <td className="max-w-0 truncate py-2">{pair(r)}</td>
                <td className="hidden py-2 sm:table-cell">{r.numero}</td>
                <td className="py-2 text-right">{r.isNt ? 'NT' : 'Incompleta'}</td>
                <td className="px-4 py-2 text-right">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
