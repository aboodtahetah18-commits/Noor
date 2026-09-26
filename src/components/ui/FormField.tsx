import type { ReactNode } from 'react';

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, hint, required = false, children }: FormFieldProps) {
  const messageId = `${htmlFor}-message`;

  return (
    <div className="ux-field" data-invalid={error ? 'true' : undefined}>
      <label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ux-field-required" aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? (
        <div id={messageId} className="ux-field-error" role="alert">{error}</div>
      ) : hint ? (
        <small id={messageId}>{hint}</small>
      ) : null}
    </div>
  );
}
