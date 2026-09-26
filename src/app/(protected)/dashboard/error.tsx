'use client';

import { Button, FeedbackState } from '@/components/ui';
import styles from './dashboard.module.css';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={`${styles.page} ${styles.statePage}`} dir="rtl">
      <div className={styles.stateCard}>
        <FeedbackState
          tone="error"
          title="تعذر تحميل لوحة التحكم"
          action={<Button type="button" onClick={reset}>إعادة المحاولة</Button>}
        >
          لم تكتمل قراءة البيانات الحالية. يمكنك إعادة المحاولة دون تغيير أي بيانات.
        </FeedbackState>
      </div>
    </div>
  );
}
