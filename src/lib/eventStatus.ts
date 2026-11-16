export type EventStatus = 'DRAFT' | 'OPEN' | 'DRAWN' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

export type EventStatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const EVENT_STATUS: Record<EventStatus, { label: string; tone: EventStatusTone }> = {
  DRAFT: { label: 'Aberta', tone: 'neutral' },
  OPEN: { label: 'Aberta', tone: 'neutral' },
  DRAWN: { label: 'Sorteada', tone: 'accent' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'warning' },
  FINISHED: { label: 'Finalizada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
};

export const eventStatusBadge = (status: EventStatus) => EVENT_STATUS[status];
