import Link from 'next/link';
import { ReportFilters } from '../../../src/components/reports/ReportFilters';
import { EventStatusBadge } from '../../../src/components/events/EventStatusBadge';
import { EmptyState, PageHeader, StatTile } from '../../../src/components/ui';
import { MANAGER_ROLES } from '../../../src/server/permissions';
import { getReportOverview } from '../../../src/server/services/reports';
import { listOwners } from '../../../src/server/services/users';
import { requireUser } from '../../../src/server/session';

type Params = Promise<{ dono?: string; status?: string; de?: string; ate?: string }>;

export default async function RelatoriosPage({ searchParams }: { searchParams: Params }) {
  const user = await requireUser();
  const sp = await searchParams;
  const canFilter = (MANAGER_ROLES as readonly string[]).includes(user.role);
  const [overview, owners] = await Promise.all([
    getReportOverview(user, { ownerId: canFilter ? sp.dono : undefined, status: sp.status, from: sp.de, to: sp.ate }),
    canFilter ? listOwners(user) : Promise.resolve(null),
  ]);
  const t = overview.totals;
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Relatórios" description="Operação consolidada por proprietário, status e período." />
      <div className="mt-6 grid gap-4">
        <ReportFilters owners={owners} />
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Totais">
          <StatTile label="Provas" value={t.events} />
          <StatTile label="Atletas" value={t.athletes} />
          <StatTile label="Arenas" value={t.arenas} />
          <StatTile label="Sorteios" value={t.draws} />
          <StatTile label="Corridas" value={t.runs} />
        </section>
        <section className="min-w-0 rounded-ui border border-line bg-surface" aria-label="Provas recentes">
          <h2 className="border-b border-line px-4 py-2 font-display text-lg font-bold uppercase text-ink-strong">Provas recentes</h2>
          {overview.recent.length ? (
            <ul className="divide-y divide-line">
              {overview.recent.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <Link href={`/provas/${e.id}`} className="min-w-0 hover:underline">
                    <span className="block truncate font-semibold text-ink-strong">{e.name}</span>
                    <span className="text-xs text-ink-muted">{e.date} · {e.arena} · {e.registeredAthletes ?? 0} inscritos{canFilter ? ` · ${e.ownerName ?? ''}` : ''}</span>
                  </Link>
                  <EventStatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          ) : <div className="p-4"><EmptyState title="Nenhuma prova no filtro" description="Ajuste o status ou o período." /></div>}
        </section>
      </div>
    </main>
  );
}
