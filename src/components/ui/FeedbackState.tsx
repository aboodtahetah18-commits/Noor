import type { ReactNode } from 'react';

type FeedbackStateProps = {
  tone?: 'neutral' | 'success' | 'error';
  title: string;
  children?: ReactNode;
};

export function FeedbackState({ tone = 'neutral', title, children }: FeedbackStateProps) {
  return (
    <section className="ux-feedback" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {children}
    </section>
  );
}
