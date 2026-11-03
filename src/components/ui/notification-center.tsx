'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { LucideIcon } from '@/components/ui/lucide-icon';
import type { AlertItem } from '@/features/alerts/queries/get-alert-center';
import { markAlertSeenAction, snoozeAlertAction, startAlertAction } from '@/app/(protected)/alerts/actions';

type Props = { items: AlertItem[]; unavailable?: boolean };

const severityLabels: Record<AlertItem['severity'], string> = {
  CRITICAL: 'عاجل',
  WARNING: 'يحتاج انتباه',
  INFO: 'للمتابعة',
};

export function NotificationCenter({ items, unavailable = false }: Props) {
  const [open, setOpen] = useState(false);
  const pending = items.filter((item) => item.status !== 'SEEN').length;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('notifications') === '1') {
      setOpen(true);
    }
  }, []);

  return (
    <>
      <button
        type="button"
        className="ux-notification-trigger"
        onClick={() => setOpen(true)}
        title="الإشعارات"
        aria-label={pending ? 'الإشعارات، ' + pending + ' تحتاج متابعة' : 'الإشعارات'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <LucideIcon name="bell" size={20} />
        {pending > 0 ? <span className="ux-notification-count" aria-hidden="true">{pending > 99 ? '99+' : pending}</span> : null}
      </button>
      <Drawer open={open} onOpenChange={setOpen} side="end" title="الإشعارات" description="تنبيهات مرتبطة مباشرة بالصفحات والعمليات المعنية" className="ux-notification-drawer">
        {unavailable ? (
          <p className="ux-notification-unavailable" role="status">تعذر تحديث الإشعارات الآن. يمكنك متابعة العمل وإعادة المحاولة عند فتح الصفحة مجددًا.</p>
        ) : null}
        {items.length === 0 ? (
          <div className="ux-notification-empty" role="status">
            <LucideIcon name="circleCheck" size={24}/>
            <p>لا توجد إشعارات تحتاج متابعة حاليًا.</p>
          </div>
        ) : (
          <ol className="ux-notification-list">
            {items.map((item) => (
              <li key={item.key} className={'ux-notification-item ux-alert-' + item.severity.toLowerCase()}>
                <div className="ux-notification-heading">
                  <strong>{item.title}</strong>
                  <span>{severityLabels[item.severity]}</span>
                </div>
                <p>{item.detail}</p>
                <div className="ux-notification-actions">
                  <form action={startAlertAction}>
                    <input type="hidden" name="alertKey" value={item.key}/>
                    <input type="hidden" name="alertKind" value={item.kind}/>
                    <input type="hidden" name="sourceId" value={item.sourceId ?? ''}/>
                    <input type="hidden" name="href" value={item.href}/>
                    <button type="submit" aria-label={'معالجة: ' + item.title} title="بدء المعالجة"><LucideIcon name="check" size={20}/></button>
                  </form>
                  {item.status === 'NEW' ? (
                    <form action={markAlertSeenAction}>
                      <input type="hidden" name="alertKey" value={item.key}/>
                      <input type="hidden" name="alertKind" value={item.kind}/>
                      <input type="hidden" name="sourceId" value={item.sourceId ?? ''}/>
                      <button type="submit" aria-label={'تم الاطلاع: ' + item.title} title="تم الاطلاع"><LucideIcon name="eye" size={20}/></button>
                    </form>
                  ) : null}
                  {item.severity !== 'CRITICAL' ? (
                    <form action={snoozeAlertAction}>
                      <input type="hidden" name="alertKey" value={item.key}/>
                      <input type="hidden" name="alertKind" value={item.kind}/>
                      <input type="hidden" name="sourceId" value={item.sourceId ?? ''}/>
                      <input type="hidden" name="severity" value={item.severity}/>
                      <button type="submit" aria-label={'تأجيل الإشعار: ' + item.title} title="تأجيل 24 ساعة"><LucideIcon name="calendarDays" size={20}/></button>
                    </form>
                  ) : null}
                  <Link href={item.href} className="ux-notification-source" onClick={() => setOpen(false)} title="فتح الصفحة المرتبطة" aria-label={'فتح المصدر: ' + item.title}>
                    <LucideIcon name="chevronLeft" size={20}/>
                    <span>فتح المصدر</span>
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Drawer>
    </>
  );
}
