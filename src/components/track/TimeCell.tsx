'use client';

import { useRef } from 'react';
import { cn } from '../ui';

interface Props {
  runNumber: number;
  bull: 1 | 2 | 3;
  value: string;
  nt: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onNt: (nt: boolean) => void;
}

/** Foca o próximo campo de tempo da tela (ordem do documento). */
function focusNext(from: HTMLInputElement) {
  const cells = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-time-cell]:not([disabled])'));
  const next = cells[cells.indexOf(from) + 1];
  if (next) {
    next.focus();
    next.select();
  }
}

/**
 * Campo de tempo de um boi. Teclado (spec 6.6): Enter avança, Tab segue o fluxo
 * normal, `n` marca/desmarca NT e Esc devolve o valor que havia ao focar.
 */
export function TimeCell({ runNumber, bull, value, nt, disabled, onChange, onNt }: Props) {
  const valueOnFocus = useRef(value);
  return (
    <span className="flex items-center gap-1">
      <input
        data-time-cell=""
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={nt ? 'NT' : '0.00'}
        aria-label={`Tempo boi ${bull} da corrida ${runNumber}`}
        value={nt ? '' : value}
        readOnly={nt}
        disabled={disabled}
        onFocus={(event) => {
          valueOnFocus.current = value;
          event.currentTarget.select();
        }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            focusNext(event.currentTarget);
          } else if (event.key === 'n' || event.key === 'N') {
            event.preventDefault();
            onNt(!nt);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            if (value !== valueOnFocus.current) onChange(valueOnFocus.current);
          }
        }}
        className={cn(
          'h-9 w-[4.5rem] rounded-ui border px-2 text-center font-display text-lg font-bold tabular-nums text-ink-strong placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-accent',
          nt ? 'border-danger bg-danger-soft placeholder:text-danger' : 'border-line bg-surface',
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-pressed={nt}
        aria-label={`NT boi ${bull} da corrida ${runNumber}`}
        disabled={disabled}
        onClick={() => onNt(!nt)}
        className={cn(
          'h-9 rounded-ui px-1.5 font-display text-xs font-bold uppercase',
          nt ? 'bg-danger text-on-accent' : 'text-ink-muted hover:bg-nav',
        )}
      >
        NT
      </button>
    </span>
  );
}
