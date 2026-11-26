import { describe, expect, it } from 'vitest';
import { buildAthleteFilename, buildFilename, groupSumulaByAthlete, paginateByAthlete, paginateSumula, type SumulaRun } from './sumula';

const run = (numero: number, bateria: number, grupoCab = 'A', grupoPe = 'B'): SumulaRun => ({
  numero, bateria, grupoCab, grupoPe, shc: 4, bois: 2,
  cabeceiro: { nome: `CAB ${numero}`, hc: 2 }, pezeiro: { nome: `PE ${numero}`, hc: 2 },
});

describe('paginateSumula', () => {
  it('bateria maior que a página repete a faixa como continuação', () => {
    const pages = paginateSumula(Array.from({ length: 40 }, (_, i) => run(i + 1, 1)), 28);
    expect(pages).toHaveLength(2);
    expect(pages[0][0]).toMatchObject({ kind: 'band', continued: false, label: 'Bateria 1 · Cabeceiros A × Pezeiros B · Corridas 1–40' });
    expect(pages[0]).toHaveLength(28);
    expect(pages[1][0]).toMatchObject({ kind: 'band', continued: true });
    expect(pages[1].filter((i) => i.kind === 'run')).toHaveLength(13);
  });

  it('bateria com cruzamentos misturados omite os grupos na faixa e marca mixed', () => {
    const [page] = paginateSumula([run(1, 1, 'A', 'A'), run(2, 1, 'B', 'A')]);
    expect(page[0]).toMatchObject({ kind: 'band', label: 'Bateria 1 · Corridas 1–2', mixed: true });
  });

  it('nova bateria abre faixa própria; faixa nunca fica sozinha no fim da página', () => {
    const runs = [...Array.from({ length: 26 }, (_, i) => run(i + 1, 1)), run(27, 2), run(28, 2)];
    const pages = paginateSumula(runs, 28);
    expect(pages[0].at(-1)).toMatchObject({ kind: 'run' });
    expect(pages[1][0]).toMatchObject({ kind: 'band', label: expect.stringContaining('Bateria 2'), continued: false });
  });
});

it('buildFilename gera nome seguro com a versão', () => {
  expect(buildFilename('Copa Lagoa 2026', 3)).toBe('sumula-copa-lagoa-2026-v3.pdf');
  expect(buildFilename('Sorteio São João!', null)).toBe('sorteio-sorteio-sao-joao.pdf');
});

describe('súmula por atleta', () => {
  const pair = (numero: number, cab: string, pe: string, cabId?: string): SumulaRun => ({
    ...run(numero, 1),
    cabeceiro: { id: cabId, nome: cab, hc: 1.5 },
    pezeiro: { nome: pe, hc: 2 },
  });
  const runs = [pair(9, 'BAINHA', 'LEO PARA'), pair(2, 'ÁLVARO', 'LEO PARA'), pair(5, 'BAINHA', 'CABELINHO'), pair(1, 'adriano', 'CABELINHO')];

  it('agrupa por cabeceiro em ordem alfabética (sem diferenciar acento e caixa) e ordena as corridas', () => {
    const groups = groupSumulaByAthlete(runs, 'CABECEIRO');
    expect(groups.map((g) => g.nome)).toEqual(['adriano', 'ÁLVARO', 'BAINHA']);
    expect(groups[2].runs.map((r) => r.numero)).toEqual([5, 9]);
  });

  it('agrupa por pezeiro', () => {
    const groups = groupSumulaByAthlete(runs, 'PEZEIRO');
    expect(groups.map((g) => [g.nome, g.runs.map((r) => r.numero)])).toEqual([
      ['CABELINHO', [1, 5]],
      ['LEO PARA', [2, 9]],
    ]);
  });

  it('homônimos com ids diferentes ficam separados', () => {
    const groups = groupSumulaByAthlete([pair(1, 'JOSE', 'X', 'a'), pair(2, 'JOSE', 'Y', 'b')], 'CABECEIRO');
    expect(groups).toHaveLength(2);
  });

  it('cada atleta abre página nova e quebra em continuação', () => {
    const many = Array.from({ length: 5 }, (_, i) => pair(i + 1, 'ZE', 'P'));
    const pages = paginateByAthlete(groupSumulaByAthlete([...many, pair(10, 'ANA', 'P')], 'CABECEIRO'), 3);
    expect(pages.map((p) => [p.group.nome, p.runs.length, p.continued])).toEqual([
      ['ANA', 1, false],
      ['ZE', 3, false],
      ['ZE', 2, true],
    ]);
  });

  it('nome do arquivo indica a categoria', () => {
    expect(buildAthleteFilename('Copa Lagoa', 2, 'CABECEIRO')).toBe('sumula-cabeceiros-copa-lagoa-v2.pdf');
    expect(buildAthleteFilename('Copa Lagoa', 2, 'PEZEIRO')).toBe('sumula-pezeiros-copa-lagoa-v2.pdf');
  });
});
