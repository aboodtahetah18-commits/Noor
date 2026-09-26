import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', 'aria-invalid': ariaInvalid, ...props }: InputProps) {
  return (
    <input
      className={`ux-control ${className}`.trim()}
      aria-invalid={ariaInvalid}
      data-invalid={ariaInvalid === true || ariaInvalid === 'true' ? 'true' : undefined}
      {...props}
    />
  );
}
