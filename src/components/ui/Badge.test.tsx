import { describe, expect, it } from 'vitest';
import { eventStatusBadge } from './Badge';

describe('eventStatusBadge', () => {
  it('mapeia DRAFT e OPEN para "Aberta"', () => {
    expect(eventStatusBadge('DRAFT')).toEqual({ label: 'Aberta', tone: 'neutral' });
    expect(eventStatusBadge('OPEN').label).toBe('Aberta');
  });

  it('mapeia os demais status conforme a referência técnica', () => {
    expect(eventStatusBadge('DRAWN').label).toBe('Sorteada');
    expect(eventStatusBadge('IN_PROGRESS').label).toBe('Em andamento');
    expect(eventStatusBadge('FINISHED').label).toBe('Finalizada');
    expect(eventStatusBadge('CANCELLED')).toMatchObject({ label: 'Cancelada', tone: 'danger' });
  });
});
