import { Card, FeedbackState } from '@/components/ui';
import styles from './dashboard.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.page} dir="rtl" aria-busy="true" aria-live="polite">
      <div className={styles.container}>
        <FeedbackState busy title="جارٍ تجهيز لوحة التحكم">
          يتم تحميل الملخص المالي والمعلومات الحالية.
        </FeedbackState>
        <div className={styles.loadingGrid} aria-hidden="true">
          <Card className={`${styles.skeleton} ${styles.skeletonHero}`} />
          <Card className={styles.skeleton} />
          <Card className={styles.skeleton} />
          <Card className={styles.skeleton} />
          <Card className={styles.skeleton} />
        </div>
      </div>
    </div>
  );
}
