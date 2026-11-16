import { describe, expect, it } from 'vitest';
import type { Competitor, DrawConfig } from '../types/roping';
import { batteryRecommendation, boisDistribution, countPossibleRuns, effectiveBatteries } from './drawPlanning';

const c = (id: string, handicap = 2): Competitor => ({ id, nome: id, handicap });
const cfg = (over: Partial<DrawConfig> = {}): DrawConfig => ({ numGroups: 3, minGap: 5, balanceGroups: false, ...over });

describe('drawPlanning', () => {
  it('não faz dupla do atleta consigo mesmo', () => {
    expect(countPossibleRuns([c('a'), c('b')], [c('a'), c('c')])).toBe(3);
  });

  it('distribui bois pela soma dos handicaps', () => {
    expect(boisDistribution([c('a', 1), c('b', 3)], [c('x', 2), c('y', 3.5)])).toEqual({ b1: 1, b2: 2, b3: 1 });
  });

  it('modo efetivo deriva das baterias quando não informado', () => {
    expect(effectiveBatteries(cfg())).toEqual({ numBatteries: 9, mode: 'phases' });
    expect(effectiveBatteries(cfg({ numBatteries: 1 }))).toEqual({ numBatteries: 1, mode: 'single' });
    expect(effectiveBatteries(cfg({ numBatteries: 3 }))).toEqual({ numBatteries: 3, mode: 'major3' });
  });

  it('recomenda conforme o tamanho da prova', () => {
    expect(batteryRecommendation(25, 3, cfg())).toMatchObject({ numBatteries: 1, batteryMode: 'single', title: '1 Bateria Única' });
    expect(batteryRecommendation(90, 3, cfg())).toMatchObject({ numBatteries: 9, batteryMode: 'phases', runsPerBattery: 10 });
    expect(batteryRecommendation(60, 3, cfg())).toMatchObject({ numBatteries: 3, batteryMode: 'major3' });
    expect(batteryRecommendation(50, 2, cfg({ numGroups: 2 }))).toMatchObject({ numBatteries: 4, batteryMode: 'phases' });
    expect(batteryRecommendation(90, 3, cfg()).isApplied).toBe(true);
  });
});
