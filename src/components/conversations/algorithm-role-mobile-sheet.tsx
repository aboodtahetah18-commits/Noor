'use client';

import { LucideIcon } from '@/components/ui/lucide-icon';
import type { AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import { governedRoomDetails } from '@/lib/conversations/governed-room-details';
import styles from './conversation-workspace.module.css';

const kindLabel:Record<AlgorithmRoleRef['kind'],string>={
  governor:'محافظ نماء',
  central_bank_manager:'مدير بنك نماء المركزي',
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

function RoleItems({items}:{items:string[]}){
  return <div className={styles.algorithmRoleItems}>
    {items.length?items.map((item,index)=><article key={item} className={styles.algorithmRoleItem}>
      <span>البند {index+1}</span>
      <p>{item}</p>
    </article>):<p className={styles.algorithmRoleEmpty}>لا توجد بنود إضافية ضمن هذا القسم.</p>}
  </div>;
}

export function AlgorithmRoleMobileSheet({role,onClose}:{role:AlgorithmRoleRef;onClose:()=>void}){
  const policyTitles=role.policyRefs.map(ref=>policyTitle(ref)).filter((title):title is string=>Boolean(title));
  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+role.name}>
    <aside className={`${styles.mobileSheet} ${styles.algorithmRoleSheet} ${styles.mobileFullPageSheet}`}>
      <div className={styles.sheetHeader}><strong>الوصف الوظيفي الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.algorithmRoleContent}>
        <section className={styles.algorithmRoleHero}>
          <div><strong>{role.name}</strong><small>{kindLabel[role.kind]}، ويتبع إلى {role.reportsTo}</small></div>
          <LucideIcon name={role.kind==='advisor'?'sparkles':'circleUserRound'} size={24}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة ١</small><strong>المهمة الأساسية</strong></header>
          <div className={styles.algorithmRoleItem}><span>البند ١</span><p>{role.mandate}</p></div>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة ٢</small><strong>المسؤوليات التي يُحاسب عليها</strong></header>
          <RoleItems items={role.accountableFor}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة ٣</small><strong>مؤشرات الأداء</strong></header>
          <RoleItems items={role.kpis}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة ٤</small><strong>حالات التصعيد</strong></header>
          <RoleItems items={role.escalation}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة ٥</small><strong>الحدود والمحظورات</strong></header>
          <RoleItems items={role.prohibited}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة ٦</small><strong>السياسات والمراجع الحاكمة</strong></header>
          <div className={styles.algorithmRoleItems}>
            {policyTitles.length?policyTitles.map((title,index)=><article key={title} className={styles.algorithmRoleItem}><span>المرجع {index+1}</span><p>{title}</p></article>):<p className={styles.algorithmRoleEmpty}>المراجع محفوظة في سجل الجهة.</p>}
          </div>
        </section>
      </div>
    </aside>
  </div>;
}
