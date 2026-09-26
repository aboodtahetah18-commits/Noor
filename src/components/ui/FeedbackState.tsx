import type { ReactNode } from 'react';

export type FeedbackTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export type FeedbackStateProps = {
  tone?: FeedbackTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  busy?: boolean;
};

export function FeedbackState({ tone = 'neutral', title, children, action, busy = false }: FeedbackStateProps) {
  return (
    <section
      className="ux-feedback"
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      aria-busy={busy || undefined}
    >
      <div className="ux-feedback-copy">
        <strong>{title}</strong>
        {children ? <div>{children}</div> : null}
      </div>
      {action ? <div className="ux-feedback-action">{action}</div> : null}
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <FeedbackState title={title} action={action}>{children}</FeedbackState>;
}
