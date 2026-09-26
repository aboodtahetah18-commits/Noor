import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className = '', interactive = false, ...props }: CardProps) {
  return (
    <div
      className={`ux-surface ${className}`.trim()}
      data-interactive={interactive ? 'true' : undefined}
      {...props}
    />
  );
}
