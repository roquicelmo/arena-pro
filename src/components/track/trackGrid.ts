/**
 * Grid da pista no desktop, compartilhado com o cabeçalho (TrackHeader). Cada boi ocupa
 * uma faixa de largura fixa (--track-times, definida pela maior quantidade de bois da
 * prova), então as colunas ficam alinhadas mesmo entre corridas com números de bois diferentes.
 */
export const TRACK_GRID = 'lg:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_4rem_var(--track-times)_6rem_6rem] lg:items-center';
export const TRACK_BULLS = 'lg:grid lg:grid-flow-col lg:auto-cols-[7.25rem] lg:gap-2';
export const trackTimesWidth = (maxBulls: number) => `calc(${maxBulls} * 7.25rem + ${Math.max(0, maxBulls - 1)} * 0.5rem)`;
