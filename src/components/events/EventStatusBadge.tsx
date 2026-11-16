import type { EventSummary } from '../../types/events';
import { Badge, eventStatusBadge, type EventStatus } from '../ui';

const DB_STATUS: Record<EventSummary['status'], EventStatus> = {
  ABERTA: 'OPEN',
  SORTEADA: 'DRAWN',
  'EM ANDAMENTO': 'IN_PROGRESS',
  FINALIZADA: 'FINISHED',
  CANCELADA: 'CANCELLED',
};

export function EventStatusBadge({ status }: { status: EventSummary['status'] }) {
  const { label, tone } = eventStatusBadge(DB_STATUS[status]);
  return <Badge tone={tone}>{label}</Badge>;
}
