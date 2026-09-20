'use client';

import { LucideIcon } from '@/components/ui/lucide-icon';
import type { AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import { governedRoomDetails } from '@/lib/conversations/governed-room-details';
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

const policyTitle=(ref:string)=>{
  for(const detail of Object.values(governedRoomDetails)){
    const item=[...detail.policies,...detail.records].find(entry=>entry.referenceCode===ref);
    if(item) return item.title;
  }
  return null;
};

export function AlgorithmRoleMobileSheet({role,onClose}:{role:AlgorithmRoleRef;onClose:()=>void}){
  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+role.name}>
    <aside className={`${styles.mobileSheet} ${styles.algorithmRoleSheet} ${styles.mobileFullPageSheet}`}>
      <div className={styles.sheetHeader}><strong>الوصف الوظيفي الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
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
        <details open><summary>السياسات والمراجع التي يستند إليها</summary><div className={styles.algorithmRoleRefs}>{role.policyRefs.map(ref=>policyTitle(ref)).filter((title):title is string=>Boolean(title)).map(title=><span key={title}>{title}</span>)}</div></details>
      </div>
    </aside>
  </div>;
}
