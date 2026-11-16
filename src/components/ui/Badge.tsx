import React from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-nav text-ink-strong',
  accent: 'bg-accent-soft text-accent-hover',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-ui px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-wider',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type EventStatus = 'DRAFT' | 'OPEN' | 'DRAWN' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

const EVENT_STATUS: Record<EventStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Aberta', tone: 'neutral' },
  OPEN: { label: 'Aberta', tone: 'neutral' },
  DRAWN: { label: 'Sorteada', tone: 'accent' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'warning' },
  FINISHED: { label: 'Finalizada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
};

export const eventStatusBadge = (status: EventStatus) => EVENT_STATUS[status];
