import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = '', 'aria-invalid': ariaInvalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={`ux-control ${className}`.trim()}
      aria-invalid={ariaInvalid}
      data-invalid={ariaInvalid === true || ariaInvalid === 'true' ? 'true' : undefined}
      {...props}
    />
  );
}
