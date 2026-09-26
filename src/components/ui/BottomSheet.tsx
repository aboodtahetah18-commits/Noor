'use client';

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

export type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  className?: string;
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = 'إغلاق اللوحة',
  className = '',
}: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const close = () => onOpenChange(false);
  const onBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) close();
  };

  return (
    <dialog
      ref={ref}
      className={`ux-bottom-sheet-surface ${className}`.trim()}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={onBackdrop}
      onClose={close}
      onCancel={(event) => { event.preventDefault(); close(); }}
    >
      <div className="ux-bottom-sheet-handle" aria-hidden="true" />
      <div className="ux-overlay-shell" dir="rtl">
        <header className="ux-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button type="button" className="ux-dialog-close" aria-label={closeLabel} onClick={close}>×</button>
        </header>
        <div className="ux-dialog-body">{children}</div>
        {footer ? <footer className="ux-dialog-actions">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
