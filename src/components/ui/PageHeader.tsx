import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  eyebrow,
  description,
  meta,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`ux-page-header ${className}`.trim()}>
      <div className="ux-page-header__content">
        {eyebrow ? <p className="ux-page-header__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="ux-page-header__description">{description}</p> : null}
        {meta ? <div className="ux-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="ux-page-header__actions">{actions}</div> : null}
    </header>
  );
}
