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
    {items.length?items.map((item,index)=><article key={prefix+'-'+index} className={styles.algorithmRoleItem}>
      <span>{prefix}.{index+1}</span>
      <p>{item}</p>
    </article>):<p className={styles.algorithmRoleEmpty}>لا توجد بنود إضافية ضمن هذا القسم.</p>}
  </div>;
}

function RoleSection({number,title,items}:{number:number;title:string;items:string[]}){
  if(!items.length)return null;
  return <section className={styles.algorithmRoleSection}>
    <header><small>المادة {number}</small><strong>{title}</strong></header>
    <RoleItems prefix={String(number)} items={items}/>
  </section>;
}

export function AlgorithmRoleMobileSheet({role,onClose}:{role:AlgorithmRoleRef;onClose:()=>void}){
  const policyTitles=role.policyRefs.map(ref=>policyTitle(ref)).filter((title):title is string=>Boolean(title));
  const sections=[
    {title:'المسؤوليات الرئيسية',items:role.accountableFor},
    {title:'الصلاحيات داخل التفويض',items:role.authorities},
    {title:'القرارات التي يملكها أو يرفعها',items:role.decisions??[]},
    {title:'المدخلات والبيانات التي يعتمد عليها',items:role.inputs??[]},
    {title:'المخرجات التي يصدرها',items:role.outputs??[]},
    {title:'العلاقات مع الجهات الأخرى',items:role.relations??[]},
    {title:'مؤشرات الأداء',items:role.kpis},
    {title:'محفزات وحالات التصعيد',items:role.escalation},
    {title:'الحدود والمحظورات',items:role.prohibited},
    {title:'الإشعارات والمتابعة',items:role.notifications??[]},
    {title:'سجل التدقيق والتتبع',items:role.audit??[]},
    {title:'الشاشات والواجهات المرتبطة',items:role.interfaces??[]},
    {title:'حالات الخطأ والاستثناء',items:role.exceptions??[]},
    {title:'السياسات والمراجع الحاكمة',items:policyTitles},
  ].filter(section=>section.items.length);

  return <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={'تفاصيل '+role.name}>
    <aside className={`${styles.mobileSheet} ${styles.algorithmRoleSheet} ${styles.mobileFullPageSheet}`}>
      <div className={styles.sheetHeader}><strong>الوصف الوظيفي الحاكم</strong><button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
      <div className={styles.algorithmRoleContent}>
        <section className={styles.algorithmRoleHero}>
          <div><strong>{role.name}</strong><small>{kindLabel[role.kind]}، ويتبع إلى {role.reportsTo}</small></div>
          {roleAvatar[role.key]
            ?<span className={styles.algorithmRolePortrait}><Image className={styles.algorithmRolePortraitImage} src={roleAvatar[role.key]!} alt={role.name} width={96} height={96}/></span>
            :<LucideIcon name={role.kind==='advisor'?'sparkles':'circleUserRound'} size={24}/>}
        </section>

        <section className={styles.algorithmRoleSection}>
          <header><small>المادة 1</small><strong>الغرض من الدور والمهمة الأساسية</strong></header>
          <div className={styles.algorithmRoleItem}><span>1.1</span><p>{role.mandate}</p></div>
        </section>

        {sections.map((section,index)=><RoleSection key={section.title} number={index+2} title={section.title} items={section.items}/>)}
      </div>
    </aside>
  </div>;
}
