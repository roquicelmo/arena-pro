import type { BatteryMode, Competitor, DrawConfig } from '../types/roping';
import { calculateBois } from '../utils/drawAlgorithm';

/** Duplas possíveis (o mesmo atleta não faz dupla consigo mesmo). */
export const countPossibleRuns = (cabeceiros: Competitor[], pezeiros: Competitor[]) =>
  cabeceiros.reduce((acc, cab) => acc + pezeiros.filter((pe) => pe.id !== cab.id).length, 0);

/** Quantas duplas correriam 1, 2 ou 3 bois, pela soma dos handicaps. */
export function boisDistribution(cabeceiros: Competitor[], pezeiros: Competitor[]) {
  const out = { b1: 0, b2: 0, b3: 0 };
  for (const cab of cabeceiros) {
    for (const pe of pezeiros) {
      if (cab.id === pe.id) continue;
      const bois = calculateBois(Number((cab.handicap + pe.handicap).toFixed(1)));
      out[`b${bois}` as 'b1' | 'b2' | 'b3'] += 1;
    }
  }
  return out;
}

/** Baterias e modo em vigor (deriva o modo quando a configuração não traz um). */
export function effectiveBatteries(config: DrawConfig): { numBatteries: number; mode: BatteryMode } {
  const phases = config.numGroups * config.numGroups;
  const numBatteries = config.numBatteries ?? phases;
  const mode: BatteryMode = config.batteryMode
    ?? (numBatteries === 1 ? 'single' : numBatteries === 3 && phases === 9 ? 'major3' : numBatteries === phases ? 'phases' : 'custom');
  return { numBatteries, mode };
}

/** Opção "grandes baterias" conforme o número de grupos. */
export function majorBatteries(numGroups: number): { num: number; mode: BatteryMode; label: string; sub: string } {
  if (numGroups === 2) return { num: 2, mode: 'custom', label: '2 baterias', sub: 'Diretos e cruzados' };
  if (numGroups === 4) return { num: 4, mode: 'custom', label: '4 baterias', sub: '4 grandes sessões' };
  return { num: 3, mode: 'major3', label: '3 baterias', sub: 'Diretos, cruzados 1 e 2' };
}

interface Rec { numBatteries: number; batteryMode: BatteryMode; title: string; reason: string }

/** Recomendação de baterias para a arena (mesmos limiares do configurador anterior). */
export function batteryRecommendation(runs: number, numGroups: number, config: DrawConfig) {
  const avg = (n: number) => Math.ceil(runs / n);
  let rec: Rec;
  if (runs <= 25) {
    rec = { numBatteries: 1, batteryMode: 'single', title: '1 Bateria Única', reason: `Com apenas ${runs} corridas, uma bateria contínua mantém o ritmo da arena.` };
  } else if (numGroups === 3) {
    rec = runs >= 90
      ? { numBatteries: 9, batteryMode: 'phases', title: '9 Baterias (Padrão Oficial)', reason: `${runs} corridas em 3 chaves: lotes de ~${avg(9)} corridas, uma fase de cruzamento por bateria.` }
      : { numBatteries: 3, batteryMode: 'major3', title: '3 Grandes Baterias', reason: `Com ${runs} corridas, 9 baterias ficariam fragmentadas; 3 sessões de ~${avg(3)} corridas (diretos, cruzados 1 e 2).` };
  } else if (numGroups === 2) {
    rec = runs >= 50
      ? { numBatteries: 4, batteryMode: 'phases', title: '4 Baterias (Por Cruzamento)', reason: `${runs} corridas em 2 chaves: A×A, B×B, A×B e B×A com ~${avg(4)} corridas cada.` }
      : { numBatteries: 2, batteryMode: 'custom', title: '2 Baterias (Diretos e Cruzados)', reason: `Duas sessões equilibradas de ~${avg(2)} corridas.` };
  } else {
    rec = runs >= 120
      ? { numBatteries: 8, batteryMode: 'custom', title: '8 Baterias', reason: `${runs} corridas em 8 lotes de ~${avg(8)} corridas.` }
      : { numBatteries: 4, batteryMode: 'custom', title: '4 Grandes Baterias', reason: `4 sessões de ~${avg(4)} corridas.` };
  }
  const current = effectiveBatteries(config);
  const isApplied = current.numBatteries === rec.numBatteries && (current.mode === rec.batteryMode || rec.batteryMode === 'custom');
  return { ...rec, runsPerBattery: avg(rec.numBatteries), isApplied };
}
