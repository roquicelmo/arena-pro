import React, { useId } from 'react';
import { cn } from './cn';
import { describedBy, FieldShell, fieldControlClasses } from './Field';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, id, className, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        className={cn(fieldControlClasses(Boolean(error)), className)}
        {...props}
      />
    </FieldShell>
  );
});

Input.displayName = 'Input';
