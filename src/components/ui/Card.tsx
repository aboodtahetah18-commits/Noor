import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  density?: 'compact' | 'comfortable';
  interactive?: boolean;
};

export function Card({
  density = 'comfortable',
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`ux-card ${className}`.trim()}
      data-density={density}
      data-interactive={interactive ? 'true' : 'false'}
      {...props}
    />
  );
}
