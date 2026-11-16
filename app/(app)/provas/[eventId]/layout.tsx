import { EventStatusBadge } from '../../../../src/components/events/EventStatusBadge';
import { PageHeader } from '../../../../src/components/ui';
import { EventTabs } from './EventTabs';
import { loadEvent } from './loadEvent';

export default async function EventLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ eventId: string }> }>) {
  const { eventId } = await params;
  const { event } = await loadEvent(eventId);
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Prova"
        title={event.name}
        description={`${event.date} · ${event.arena}`}
        actions={<EventStatusBadge status={event.status} />}
      />
      <EventTabs eventId={event.id} />
      <div className="mt-6">{children}</div>
    </main>
  );
}
