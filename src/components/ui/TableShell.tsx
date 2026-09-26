import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';

export type TableShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  ariaLabel?: string;
};

export function TableShell({ className = '', children, ariaLabel, ...props }: TableShellProps) {
  return (
    <div
      className={`ux-table-wrap ${className}`.trim()}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      tabIndex={ariaLabel ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
};

export function Table({ className = '', children, ...props }: TableProps) {
  return (
    <table className={`ux-table ${className}`.trim()} {...props}>
      {children}
    </table>
  );
}
