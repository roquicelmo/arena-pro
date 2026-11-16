import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { splitAgenda } from '../../lib/agenda';
import type { EventSummary } from '../../types/events';
import { EmptyState } from '../ui';
import { EventStatusBadge } from './EventStatusBadge';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function AgendaItem({ event, showOwner }: { event: EventSummary; showOwner: boolean }) {
  const [, month, day] = event.isoDate.split('-');
  return (
    <li>
      <Link href={`/provas/${event.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-nav sm:px-5">
        <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-ui border border-line bg-nav">
          <span className="font-display text-2xl font-bold leading-none text-ink-strong">{day}</span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink-muted">{MONTHS[Number(month) - 1]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-strong">{event.name}</span>
          <span className="block truncate text-sm text-ink-muted">{event.arena} · {event.registeredAthletes ?? 0} inscritos</span>
          {showOwner && <span className="block truncate text-xs text-ink-muted">Dono: {event.ownerName ?? 'Sem atribuição'}</span>}
        </span>
        <span className="shrink-0"><EventStatusBadge status={event.status} /></span>
      </Link>
    </li>
  );
}

function Section({ title, events, showOwner }: { title: string; events: EventSummary[]; showOwner: boolean }) {
  return (
    <section className="rounded-ui border border-line bg-surface">
      <h2 className="border-b border-line px-5 py-4 font-display text-xl font-bold uppercase tracking-wide text-ink-strong">{title}</h2>
      {events.length ? (
        <ul className="divide-y divide-line">{events.map((event) => <AgendaItem key={event.id} event={event} showOwner={showOwner} />)}</ul>
      ) : (
        <p className="px-5 py-6 text-sm text-ink-muted">Nenhuma prova por aqui.</p>
      )}
    </section>
  );
}

export function AgendaList({ events, today, showOwner }: { events: EventSummary[]; today: string; showOwner: boolean }) {
  const { upcoming, past } = splitAgenda(events, today);
  if (!upcoming.length && !past.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhuma prova na agenda"
        description="Crie uma prova para ela aparecer aqui."
        action={<Link href="/provas" className="text-sm font-semibold text-accent hover:text-accent-hover">Ir para provas</Link>}
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <Section title="Próximas provas" events={upcoming} showOwner={showOwner} />
      {past.length > 0 && <Section title="Provas anteriores" events={past} showOwner={showOwner} />}
    </div>
  );
}
