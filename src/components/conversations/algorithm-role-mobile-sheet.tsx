'use client';

import Image from 'next/image';
import { LucideIcon } from '@/components/ui/lucide-icon';
import type { AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import { governedRoomDetails } from '@/lib/conversations/governed-room-details';
import styles from './conversation-workspace.module.css';

const kindLabel:Record<AlgorithmRoleRef['kind'],string>={
  governor:'محافظ بنك نماء المركزي',
  central_bank_manager:'مدير بنك نماء المركزي',
  bank_manager:'مدير البنك',
  responsibility_owner:'مسؤول مالي',
  advisor:'مستشار اقتصادي',
  operations:'وحدة تشغيلية',
  secretary:'أمين السر المركزي',
  council:'جهة حوكمة واعتماد',
};

const policyTitle=(ref:string)=>{
  for(const detail of Object.values(governedRoomDetails)){
    const item=[...detail.policies,...detail.records].find(entry=>entry.referenceCode===ref);
    if(item) return item.title;
  }
  return null;
};

const roleAvatar:Partial<Record<string,string>>={
  'central-governor':'/brand/governor.webp',
  'central-bank-manager':'/brand/central-bank-manager.webp',
  'solvency-manager':'/brand/malaa-manager.webp',
  'assets-manager':'/brand/assets-manager.webp',
  'hilal-manager':'/brand/hilal-manager.webp',
  'economic-advisor':'/brand/economic-advisor.webp',
};

function RoleItems({items,prefix}:{items:string[];prefix:string}){
  return <div className={styles.algorithmRoleItems}>
    {items.length?items.map((item,index)=><article key={item} className={styles.algorithmRoleItem}>
      <span>{prefix}.{index+1}</span>
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
          {roleAvatar[role.key]
            ?<span className={styles.algorithmRolePortrait}><Image src={roleAvatar[role.key]!} alt={role.name} fill sizes="72px"/></span>
            :<LucideIcon name={role.kind==='advisor'?'sparkles':'circleUserRound'} size={24}/>}
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 1</small><strong>الغرض من الدور والمهمة الأساسية</strong></header>
          <div className={styles.algorithmRoleItem}><span>1.1</span><p>{role.mandate}</p></div>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 2</small><strong>المسؤوليات الرئيسية</strong></header>
          <RoleItems prefix="2" items={role.accountableFor}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 3</small><strong>الصلاحيات داخل التفويض</strong></header>
          <RoleItems prefix="3" items={role.authorities}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 4</small><strong>مؤشرات الأداء</strong></header>
          <RoleItems prefix="4" items={role.kpis}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 5</small><strong>حالات التصعيد</strong></header>
          <RoleItems prefix="5" items={role.escalation}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 6</small><strong>الحدود والمحظورات</strong></header>
          <RoleItems prefix="6" items={role.prohibited}/>
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 7</small><strong>السياسات والمراجع الحاكمة</strong></header>
          <div className={styles.algorithmRoleItems}>
            {policyTitles.length?policyTitles.map((title,index)=><article key={title} className={styles.algorithmRoleItem}><span>7.{index+1}</span><p>{title}</p></article>):<p className={styles.algorithmRoleEmpty}>المراجع محفوظة في سجل الجهة.</p>}
          </div>
        </section>
      </div>
    </aside>
  </div>;
}
