import { describe, expect, it } from 'vitest';
import { buildFilename, paginateSumula, type SumulaRun } from './sumula';

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
