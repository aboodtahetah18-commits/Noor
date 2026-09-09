import type { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="ux-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <div className="ux-field-error" role="alert">{error}</div> : hint ? <small>{hint}</small> : null}
    </div>
  );
}
