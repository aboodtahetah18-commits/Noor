import type { HTMLAttributes, ReactNode } from 'react';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
  children: ReactNode;
};

export function StatusBadge({ tone = 'neutral', className = '', children, ...props }: StatusBadgeProps) {
  return (
    <span className={`ux-badge ${className}`.trim()} data-tone={tone} {...props}>
      {children}
    </span>
  );
}
