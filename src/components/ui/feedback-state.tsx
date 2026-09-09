import type { ReactNode } from 'react';

export function FeedbackState({
  tone = 'neutral',
  title,
  children,
  action,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={`p47-feedback-state is-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="p47-feedback-mark" aria-hidden="true" />
      <div className="p47-feedback-copy">
        <strong>{title}</strong>
        {children ? <div>{children}</div> : null}
      </div>
      {action ? <div className="p47-feedback-action">{action}</div> : null}
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <FeedbackState title={title} action={action}>{children}</FeedbackState>;
}
