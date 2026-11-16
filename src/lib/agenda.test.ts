import { describe, expect, it } from 'vitest';
import type { EventSummary } from '../types/events';
import { splitAgenda, todayInSaoPaulo } from './agenda';

const ev = (id: string, isoDate: string, status: EventSummary['status'] = 'ABERTA') => ({ id, isoDate, status }) as EventSummary;

describe('agenda', () => {
  it('separa próximas e anteriores, ignorando canceladas', () => {
    const { upcoming, past } = splitAgenda([ev('a', '2026-12-20'), ev('b', '2026-11-16'), ev('c', '2026-10-01'), ev('d', '2026-12-01', 'CANCELADA'), ev('e', '2026-09-01')], '2026-11-16');
    expect(upcoming.map((e) => e.id)).toEqual(['b', 'a']);
    expect(past.map((e) => e.id)).toEqual(['c', 'e']);
  });

  it('usa o dia de São Paulo', () => {
    expect(todayInSaoPaulo(new Date('2026-11-17T02:30:00Z'))).toBe('2026-11-16');
  });
});
