import React, { useId } from 'react';
import { cn } from './cn';
import { describedBy, FieldShell, fieldControlClasses } from './Field';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, id, className, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (
      <FieldShell id={selectId} label={label} hint={hint} error={error}>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, hint, error)}
          className={cn(fieldControlClasses(Boolean(error)), 'pr-8', className)}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);

Select.displayName = 'Select';
