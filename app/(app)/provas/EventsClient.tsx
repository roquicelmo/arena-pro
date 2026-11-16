'use client';

import { useRouter } from 'next/navigation';
import { EventsPage, type ArenaOption, type EventFormInput } from '../../../src/components/EventsPage';
import { toast, useConfirm } from '../../../src/components/ui';
import { apiRequest } from '../../../src/lib/apiClient';
import type { EventSummary } from '../../../src/types/events';

interface EventsClientProps {
  events: EventSummary[];
  arenas: ArenaOption[];
  owners: Array<{ id: string; name: string | null; email: string }>;
  canFilterOwners: boolean;
  defaultOwnerId: string;
}

const toIsoNoon = (date: string) => new Date(`${date}T12:00:00`).toISOString();
const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function EventsClient({ events, arenas, owners, canFilterOwners, defaultOwnerId }: EventsClientProps) {
  const router = useRouter();
  const confirm = useConfirm();

  const onCreate = async (input: EventFormInput) => {
    try {
      await apiRequest('/api/events', jsonInit('POST', { ...input, eventDate: toIsoNoon(input.eventDate) }), 'Não foi possível criar a prova.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a prova.');
      throw error;
    }
    toast.success('Prova criada.');
    router.refresh();
  };

  const onUpdate = async (eventId: string, input: Pick<EventFormInput, 'name' | 'eventDate'>) => {
    try {
      await apiRequest(`/api/events/${eventId}`, jsonInit('PATCH', { ...input, eventDate: toIsoNoon(input.eventDate) }), 'Não foi possível atualizar a prova.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a prova.');
      throw error;
    }
    toast.success('Prova atualizada.');
    router.refresh();
  };

  const onDelete = async (event: EventSummary) => {
    const confirmed = await confirm({
      title: 'Cancelar a prova?',
      description: `A prova "${event.name}" será marcada como cancelada.`,
      confirmLabel: 'Cancelar prova',
      cancelLabel: 'Manter prova',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiRequest(`/api/events/${event.id}`, { method: 'DELETE' }, 'Não foi possível cancelar a prova.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cancelar a prova.');
      return;
    }
    toast.success('Prova cancelada.');
    router.refresh();
  };

  return (
    <EventsPage
      events={events}
      arenas={arenas}
      owners={owners}
      canFilterOwners={canFilterOwners}
      defaultOwnerId={defaultOwnerId}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}
