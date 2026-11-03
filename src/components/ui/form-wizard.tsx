'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { LucideIcon } from './lucide-icon';

export type WizardStep = {
  title: string;
  content: ReactNode;
};

type Props = {
  steps: WizardStep[];
  finish: ReactNode;
  className?: string;
};

/** Divide one real form into pages without replacing its submit action or dropping fields. */
export function FormWizard({ steps, finish, className = '' }: Props) {
  const [active, setActive] = useState(0);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);
  const id = useId();
  const current = Math.min(active, Math.max(0, steps.length - 1));

  function goNext() {
    const panel = panelRefs.current[current];
    if (!panel) return;
    const controls = panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]), select, textarea'
    );
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity();
        control.focus();
        return;
      }
    }
    setActive((value) => Math.min(value + 1, steps.length - 1));
  }

  if (!steps.length) return null;

  return (
    <div className={['ux-form-wizard', className].filter(Boolean).join(' ')}>
      <ol className="ux-wizard-progress" aria-label="خطوات الإدخال">
        {steps.map((step, index) => (
          <li key={index} aria-current={current === index ? 'step' : undefined} className={current === index ? 'is-current' : index < current ? 'is-complete' : ''}>
            <span className="ux-wizard-number">{index + 1}</span>
            <span>{step.title}</span>
          </li>
        ))}
      </ol>

      {steps.map((step, index) => (
        <section
          key={index}
          id={id + '-page-' + index}
          ref={(node) => { panelRefs.current[index] = node; }}
          className="ux-wizard-page"
          role="group"
          aria-label={step.title}
          hidden={current !== index}
        >
          {step.content}
        </section>
      ))}

      <div className="ux-wizard-actions">
        {current > 0 ? (
          <button type="button" className="ux-wizard-back" title="السابق" aria-label="الخطوة السابقة" onClick={() => setActive((value) => Math.max(0, value - 1))}>
            <LucideIcon name="chevronRight" size={20} />
          </button>
        ) : <span aria-hidden="true" />}
        {current < steps.length - 1 ? (
          <button type="button" className="ux-wizard-next" title="التالي" aria-label="الخطوة التالية" onClick={goNext}>
            <LucideIcon name="chevronLeft" size={20} />
          </button>
        ) : finish}
      </div>
    </div>
  );
}
