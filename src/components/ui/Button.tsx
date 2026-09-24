import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ux-button ux-button--${variant} ${className}`.trim()}
      data-size={size}
      data-block={block ? 'true' : 'false'}
      {...props}
    >
      {children}
    </button>
  );
}
