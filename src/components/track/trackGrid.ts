/**
 * Grid da pista no desktop, compartilhado com o cabeçalho (TrackHeader). Cada boi ocupa
 * uma faixa de largura fixa (--track-times, definida pela maior quantidade de bois da
 * prova), então as colunas ficam alinhadas mesmo entre corridas com números de bois diferentes.
 */
export const TRACK_GRID = 'lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_3.5rem_var(--track-times)_4.5rem_4.5rem] lg:items-center';
export const TRACK_BULLS = 'lg:grid lg:grid-flow-col lg:auto-cols-[6.5rem] lg:gap-2';
export const trackTimesWidth = (maxBulls: number) => `calc(${maxBulls} * 6.5rem + ${Math.max(0, maxBulls - 1)} * 0.5rem)`;
