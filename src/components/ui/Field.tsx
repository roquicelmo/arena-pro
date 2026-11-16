import React from 'react';
import { cn } from './cn';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export const fieldControlClasses = (hasError: boolean) =>
  cn(
    'h-10 w-full rounded-ui border bg-surface px-3 text-[0.95rem] text-ink-strong placeholder:text-ink-muted/70',
    'focus:outline-none focus:ring-2 focus:ring-accent/40',
    hasError ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
  );

export const describedBy = (id: string, hint?: string, error?: string) =>
  [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

export function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-strong">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
