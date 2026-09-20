'use client';

import { LucideIcon } from '@/components/ui/lucide-icon';
import type { AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import styles from './conversation-workspace.module.css';

const kindLabel:Record<AlgorithmRoleRef['kind'],string>={
  governor:'محافظ خوارزمي',
  bank_manager:'مدير بنك خوارزمي',
  responsibility_owner:'صاحب مسؤولية مالية',
  advisor:'مستشار خوارزمي',
  operations:'وحدة تشغيلية',
  secretary:'أمين سر خوارزمي',
  council:'جهة اعتماد حوكمي',
};

export function AlgorithmRoleMobileSheet({role,onClose}:{role:AlgorithmRoleRef;onClose:()=>void}){
  return <div className={`${styles.mobileOverlay} ${styles.fullPageOverlay}`} role="dialog" aria-modal="true" aria-label={'تفاصيل '+role.name}>
    <aside className={`${styles.mobileSheet} ${styles.algorithmRoleSheet} ${styles.fullPageSheet}`}>
      <div className={`${styles.sheetHeader} ${styles.fullPageHeader}`}><strong>الوصف الوظيفي الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.algorithmRoleContent}>
        <section className={styles.algorithmRoleHero}>
          <div><strong>{role.name}</strong><small>{kindLabel[role.kind]} · يتبع إلى {role.reportsTo}</small></div>
          <LucideIcon name={role.kind==='advisor'?'sparkles':'circleUserRound'} size={24}/>
        </section>
        <section><small>المهمة الأساسية</small><p>{role.mandate}</p></section>
        <details open><summary>ما يُحاسب عليه</summary><ul>{role.accountableFor.map(item=><li key={item}>{item}</li>)}</ul></details>
        <details><summary>مؤشرات الأداء</summary><ul>{role.kpis.map(item=><li key={item}>{item}</li>)}</ul></details>
        <details><summary>متى يصعّد؟</summary><ul>{role.escalation.map(item=><li key={item}>{item}</li>)}</ul></details>
        <details><summary>ما لا يجوز له فعله</summary><ul>{role.prohibited.map(item=><li key={item}>{item}</li>)}</ul></details>
        <details open><summary>السياسات والمراجع التي يستند إليها</summary><p>ترتبط صلاحيات هذا الدور بالمراجع والسياسات الحاكمة داخل ملف الجهة، وتُراجع منها قبل أي توصية أو تصعيد.</p></details>
      </div>
    </aside>
  </div>;
}
