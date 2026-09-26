import type { SelectHTMLAttributes } from 'react';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = '', 'aria-invalid': ariaInvalid, ...props }: SelectProps) {
  return (
    <select
      className={`ux-control ${className}`.trim()}
      aria-invalid={ariaInvalid}
      data-invalid={ariaInvalid === true || ariaInvalid === 'true' ? 'true' : undefined}
      {...props}
    />
  );
}
