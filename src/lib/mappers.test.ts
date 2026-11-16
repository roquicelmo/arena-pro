import { describe, expect, it } from 'vitest';
import { eventStatusLabel, mapPersistedRuns, toCompetitor, toEventSummary } from './mappers';
import type { PersistedAthlete, PersistedRun } from './mappers';

const athleteFixture = (over: Partial<PersistedAthlete> = {}): PersistedAthlete => ({
  id: 'a1', registrationNo: null, name: 'Fulano', city: null, headHandicap: '3', heelHandicap: '2', ...over,
});

const persistedRunFixture = (over: Partial<PersistedRun> = {}): PersistedRun => ({
  id: 'r1', runNumber: 1, phase: 1, round: 1, battery: 1, headGroup: 'A', heelGroup: 'B',
  combinedHandicap: '5', numberOfBulls: 3, totalTime: null, averageTime: null, isNt: false,
  headAthlete: athleteFixture({ id: 'h' }), heelAthlete: athleteFixture({ id: 'p' }), times: [], ...over,
});

describe('mappers', () => {
  it('traduz status de prova', () => {
    expect(eventStatusLabel('DRAFT')).toBe('ABERTA');
    expect(eventStatusLabel('OPEN')).toBe('ABERTA');
    expect(eventStatusLabel('IN_PROGRESS')).toBe('EM ANDAMENTO');
  });

  it('mapeia corridas persistidas', () => {
    const [run] = mapPersistedRuns([persistedRunFixture({ numberOfBulls: 2, times: [{ bullNumber: 1, timeSeconds: '8.12', isNt: false }] })]);
    expect(run.bois).toBe(2);
    expect(run.times.boi1).toBe('8.12');
    expect(run.times.boi2).toBe('');
    expect(run.faseLabel).toBe('Fase 1: Cabeceiros A × Pezeiros B');
  });

  it('escolhe o handicap pelo papel', () => {
    expect(toCompetitor(athleteFixture({ headHandicap: '3.5', heelHandicap: '2' }), 'heel').handicap).toBe(2);
    expect(toCompetitor(athleteFixture({ headHandicap: '3.5', heelHandicap: '2' })).handicap).toBe(3.5);
  });

  it('resume a prova para a interface', () => {
    const summary = toEventSummary({
      id: 'e1', name: 'Prova', eventDate: '2026-05-10T12:00:00Z', status: 'DRAWN',
      arena: { name: 'Lagoa' }, createdBy: { id: 'u1', name: null, email: 'a@b.c' },
      _count: { registrations: 4, draws: 1 },
    });
    expect(summary).toMatchObject({ status: 'SORTEADA', arena: 'Lagoa', registeredAthletes: 4, runs: 1, ownerName: 'a@b.c', format: 'Todos x Todos' });
    expect(summary.steward).toBeUndefined();
  });
});
