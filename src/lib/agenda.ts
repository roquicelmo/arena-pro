import type { EventSummary } from '../types/events';

/** Separa a agenda em próximas e anteriores (canceladas ficam de fora). `today` em AAAA-MM-DD. */
export function splitAgenda(events: EventSummary[], today: string): { upcoming: EventSummary[]; past: EventSummary[] } {
  const active = events.filter((event) => event.status !== 'CANCELADA');
  const upcoming = active.filter((event) => event.isoDate >= today).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const past = active.filter((event) => event.isoDate < today).sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  return { upcoming, past };
}

/** Data de hoje em AAAA-MM-DD no fuso de São Paulo. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}
