import { Badge, PageHeader, eventStatusBadge, type EventStatus } from '../../../../src/components/ui';
import type { EventSummary } from '../../../../src/types/events';
import { EventTabs } from './EventTabs';
import { loadEvent } from './loadEvent';

const DB_STATUS: Record<EventSummary['status'], EventStatus> = {
  ABERTA: 'OPEN',
  SORTEADA: 'DRAWN',
  'EM ANDAMENTO': 'IN_PROGRESS',
  FINALIZADA: 'FINISHED',
  CANCELADA: 'CANCELLED',
};

export default async function EventLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ eventId: string }> }>) {
  const { eventId } = await params;
  const { event } = await loadEvent(eventId);
  const status = eventStatusBadge(DB_STATUS[event.status]);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Prova"
        title={event.name}
        description={`${event.date} · ${event.arena}`}
        actions={<Badge tone={status.tone}>{status.label}</Badge>}
      />
      <EventTabs eventId={event.id} />
      <div className="mt-6">{children}</div>
    </main>
  );
}
