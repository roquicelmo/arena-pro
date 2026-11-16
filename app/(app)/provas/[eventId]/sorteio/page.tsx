import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState } from '../../../../../src/components/ui';
import { getEventRegistrations, getLatestDraw } from '../../../../../src/server/services/draws';
import { loadEvent } from '../loadEvent';
import { DrawClient } from './DrawClient';

export default async function EventDrawPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { user, event } = await loadEvent(eventId);
  const [registrations, latestDraw] = await Promise.all([
    getEventRegistrations(user, event.id),
    getLatestDraw(user, event.id),
  ]);
  if (!registrations || !latestDraw) notFound();
  const { cabeceiros, pezeiros } = registrations;

  if (!cabeceiros.length || !pezeiros.length) {
    return (
      <EmptyState
        icon={Users}
        title="Inscrições insuficientes"
        description="O sorteio precisa de pelo menos um cabeceiro e um pezeiro inscritos na prova."
        action={
          <Link
            href={`/provas/${event.id}/inscricoes`}
            className="inline-flex h-10 items-center justify-center rounded-ui bg-accent px-4 font-display text-[0.95rem] font-semibold uppercase tracking-wide text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
          >
            Ir para inscrições
          </Link>
        }
      />
    );
  }

  return <DrawClient eventId={event.id} cabeceiros={cabeceiros} pezeiros={pezeiros} initialConfig={latestDraw.configuration} />;
}
