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

export { eventStatusBadge, type EventStatus } from '../../lib/eventStatus';
