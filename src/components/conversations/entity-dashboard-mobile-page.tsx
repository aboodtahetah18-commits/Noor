'use client';

import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import type { AlgorithmRoleRef } from '@/lib/governance/algorithm-role-registry';
import styles from './conversation-workspace.module.css';

type Status='GOOD'|'WATCH'|'ACTION'|'WAITING_DATA';
type Metric={key:string;label:string;value:string;hint:string|null;status:Status};
type Plan={ownerRef:string;ownerName:string;title:string;current:string;target:string;nextAction:string;horizon:string;status:Status;basis:string[]};
type Weekly={periodStart:string;status:string;recommendationsCreated:number;recommendationsResolved:number;obligationTransitions:number;blockedRules:number;challenges:string[]};
type Dashboard={roomKey:string;title:string;generatedAt:string;state:Status;headline:string;metrics:Metric[];attention:string[];plans:Plan[];roles:AlgorithmRoleRef[];weeklyReport:Weekly|null;externalExecution:false};
type DashboardLoadState={roomKey:string;dashboard:Dashboard|null;error:string};

const statusLabel:Record<Status,string>={GOOD:'مستقر',WATCH:'تحت المتابعة',ACTION:'يحتاج إجراء',WAITING_DATA:'بانتظار بيانات'};

export function EntityDashboardMobilePage({roomKey,onClose}:{roomKey:string;onClose:()=>void}){
  const [loadState,setLoadState]=useState<DashboardLoadState>({roomKey,dashboard:null,error:''});
  const [selectedRole,setSelectedRole]=useState<string>('all');

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/conversations/'+roomKey+'/dashboard',{cache:'no-store'})
      .then(async response=>{if(!response.ok)throw new Error('LOAD_FAILED');return response.json()})
      .then(data=>{if(cancelled)return;setLoadState({roomKey,dashboard:data.dashboard??null,error:''})})
      .catch(()=>{if(!cancelled)setLoadState({roomKey,dashboard:null,error:'تعذر تحميل لوحة الجهة الآن.'})});
    return()=>{cancelled=true};
  },[roomKey]);

  const isCurrentRoom=loadState.roomKey===roomKey;
  const dashboard=isCurrentRoom?loadState.dashboard:null;
  const error=isCurrentRoom?loadState.error:'';
  const loading=!isCurrentRoom||(!dashboard&&!error);
  const activeRole=dashboard&&selectedRole!=='all'&&dashboard.roles.some(role=>role.referenceCode===selectedRole)?selectedRole:'all';

  const visiblePlans=useMemo(()=>{
    if(!dashboard)return [];
    return activeRole==='all'?dashboard.plans:dashboard.plans.filter(item=>item.ownerRef===activeRole);
  },[dashboard,activeRole]);

  return <div className={styles.mobileFullPage} role="dialog" aria-modal="true" aria-label="لوحة الجهة">
    <header className={styles.mobileFullPageHeader}>
      <div><strong>{dashboard?.title??'لوحة الجهة'}</strong><small>قراءة تشغيلية وخطة متابعة مستمرة</small></div>
      <button type="button" onClick={onClose} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button>
    </header>

    <main className={styles.entityDashboardPage}>
      {loading&&<div className={styles.dashboardStateCard}><LucideIcon name="loaderCircle" size={24}/><p>جارٍ تجهيز القراءة الحالية…</p></div>}
      {error&&<div className={styles.dashboardStateCard}><LucideIcon name="triangleAlert" size={24}/><p>{error}</p></div>}
      {dashboard&&<>
        <section className={`${styles.dashboardHero} ${styles['dashboard_'+dashboard.state]}`}>
          <div><span>{statusLabel[dashboard.state]}</span><strong>{dashboard.headline}</strong><small>آخر تحديث: {new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(dashboard.generatedAt))}</small></div>
          <LucideIcon name="chart" size={24}/>
        </section>

        <section className={styles.dashboardMetricsGrid}>
          {dashboard.metrics.map(metric=><article key={metric.key}><small>{metric.label}</small><strong>{metric.value}</strong>{metric.hint&&<span>{metric.hint}</span>}</article>)}
        </section>

        <section className={styles.dashboardSection}>
          <header><strong>ما يحتاج انتباه الآن</strong></header>
          {dashboard.attention.length?<div className={styles.dashboardAttentionList}>{dashboard.attention.map((item,index)=><p key={index}>{item}</p>)}</div>:<p className={styles.dashboardEmpty}>لا توجد نقطة عاجلة ضمن البيانات الحالية.</p>}
        </section>

        <section className={styles.dashboardSection}>
          <header><strong>الفريق المسؤول</strong><small>اختر المسؤول لعرض خطته الخاصة.</small></header>
          <div className={styles.dashboardRoleTabs}>
            <button type="button" className={activeRole==='all'?styles.activeDashboardRole:''} onClick={()=>setSelectedRole('all')}>الجهة كاملة</button>
            {dashboard.roles.map(role=><button type="button" key={role.referenceCode} className={activeRole===role.referenceCode?styles.activeDashboardRole:''} onClick={()=>setSelectedRole(role.referenceCode)}>{role.name}</button>)}
          </div>
        </section>

        <section className={styles.dashboardSection}>
          <header><strong>الخطة الاستباقية</strong><small>لا يعتمد أي رقم بلا بيانات وسياسة مرجعية.</small></header>
          <div className={styles.dashboardPlanList}>{visiblePlans.map(plan=><article key={plan.ownerRef} className={styles.dashboardPlanCard}>
            <div className={styles.dashboardPlanTitle}><div><small>{plan.ownerName}</small><strong>{plan.title}</strong></div><span>{statusLabel[plan.status]}</span></div>
            <dl><div><dt>الوضع الحالي</dt><dd>{plan.current}</dd></div><div><dt>الهدف</dt><dd>{plan.target}</dd></div><div><dt>الخطوة التالية</dt><dd>{plan.nextAction}</dd></div><div><dt>الأفق</dt><dd>{plan.horizon}</dd></div></dl>
            <div className={styles.dashboardBasis}>{plan.basis.map(ref=><span key={ref}>{ref}</span>)}</div>
          </article>)}</div>
        </section>

        <section className={styles.dashboardSection}>
          <header><strong>آخر تقرير أسبوعي</strong></header>
          {dashboard.weeklyReport?<article className={styles.weeklyReportCard}>
            <div><strong>أسبوع {dashboard.weeklyReport.periodStart}</strong><span>{dashboard.weeklyReport.status}</span></div>
            <div className={styles.weeklyReportMetrics}><span>توصيات جديدة <b>{dashboard.weeklyReport.recommendationsCreated}</b></span><span>توصيات حُسمت <b>{dashboard.weeklyReport.recommendationsResolved}</b></span><span>تغيرات التزامات <b>{dashboard.weeklyReport.obligationTransitions}</b></span><span>قواعد محجوبة <b>{dashboard.weeklyReport.blockedRules}</b></span></div>
            {dashboard.weeklyReport.challenges.length?<div className={styles.weeklyChallenges}>{dashboard.weeklyReport.challenges.map((item,index)=><p key={index}>{item}</p>)}</div>:<p>لا توجد تحديات مسجلة في آخر تحليل أسبوعي.</p>}
          </article>:<p className={styles.dashboardEmpty}>سيظهر أول تقرير بعد أول تشغيل أسبوعي مكتمل.</p>}
        </section>

        <section className={styles.dashboardExecutionBoundary}><LucideIcon name="lockKeyhole" size={20}/><p>هذه اللوحة تراقب وتحلل وتقترح. لا تحويل ولا سداد ولا استثمار ولا تنفيذ مالي خارجي من دونك.</p></section>
      </>}
    </main>
  </div>;
}
