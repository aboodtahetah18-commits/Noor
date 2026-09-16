import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';

type TableShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TableShell({ className = '', children, ...props }: TableShellProps) {
  return (
    <div className={`ux-table-wrap ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
};

export function Table({ className = '', children, ...props }: TableProps) {
  return (
    <table className={`ux-table ${className}`.trim()} {...props}>
      {children}
    </table>
  );
}
