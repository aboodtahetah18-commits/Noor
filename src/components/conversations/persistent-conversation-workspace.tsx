'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { ThemeToggle } from '@/app/theme-toggle';
import { StatementReviewPanel } from '@/components/conversations/statement-review-panel';
import { governedRoomDetails } from '@/lib/conversations/governed-room-details';
import styles from './conversation-workspace.module.css';

type RoomKey = 'central' | 'solvency' | 'assets' | 'hilal' | 'advisor' | 'council';
type MessageKind = 'message' | 'risk' | 'decision' | 'recommendation' | 'followup' | 'request';
type Message = { id:string; sender_type:'user'|'agent'|'system'; sender_name:string; message_kind:MessageKind; body:string; structured_data?:Record<string,unknown>; created_at?:string };
type Participant = { participant_key:string; display_name:string; participant_type:string; role_label?:string };
type OnboardingStatus = { status:string; current_step:string; complete:boolean; question?:string|null };
type StatementAccount = { id:string; name:string; account_type:string; bank_name?:string|null };
type UserProfile = { id:string; name:string; email:string|null; image:string|null; emailVerified:boolean };
type OnboardingReviewFact = { key:string; label:string; raw:string; verified_at?:string; confidence:number };
type ConversationAttachment = { id:string; file_name:string; content_type?:string|null; verification_status?:string|null; created_at?:string };

type Room = { id:RoomKey; title:string; subtitle:string; lead:string; specialists:string; avatar:string; bankLogo:string };
const rooms: [Room, ...Room[]] = [
  { id:'central', title:'بنك نماء المركزي', subtitle:'الحوكمة والاستقرار', lead:'محافظ بنك نماء المركزي', specialists:'المحافظ والمستشار المختص فقط عند الحاجة', avatar:'/brand/governor.webp', bankLogo:'/brand/bank-central.webp' },
  { id:'solvency', title:'بنك ملاءة', subtitle:'الحماية والاحتياطي', lead:'مدير بنك ملاءة', specialists:'مدير بنك ملاءة ومستشار المخاطر', avatar:'/brand/malaa-manager.webp', bankLogo:'/brand/bank-malaa.webp' },
  { id:'assets', title:'بنك الأصول الاستثماري', subtitle:'الأصول والأهداف والاستثمار', lead:'مدير بنك الأصول الاستثماري', specialists:'مدير بنك الأصول الاستثماري ومستشار الاستثمار عند صلة الموضوع', avatar:'/brand/assets-manager.webp', bankLogo:'/brand/bank-assets.webp' },
  { id:'hilal', title:'بنك الهلال', subtitle:'التمويل الداخلي', lead:'مدير بنك الهلال', specialists:'مدير بنك الهلال ومستشار التمويل', avatar:'/brand/hilal-manager.webp', bankLogo:'/brand/bank-hilal.webp' },
  { id:'advisor', title:'المستشار الاقتصادي', subtitle:'تحليل الصورة المالية الكلية', lead:'المستشار الاقتصادي', specialists:'المستشار الاقتصادي أو المختص بحسب موضوع الرسالة', avatar:'/brand/economic-advisor.webp', bankLogo:'/brand/namaa-logo.webp' },
  { id:'council', title:'مجلس نماء الأعلى', subtitle:'القرارات واللجان', lead:'محافظ بنك نماء المركزي بصفته رئيس المجلس', specialists:'أعضاء اللجنة ذات الصلة فقط، وليس جميع الشخصيات', avatar:'/brand/governor.webp', bankLogo:'/brand/bank-central.webp' },
];
const labels:Record<MessageKind,string>={message:'',risk:'تقييم مخاطر',decision:'قرار / اعتماد',recommendation:'توصية',followup:'متابعة',request:'طلب إجراء'};

function formatSar(value:number){return new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(value)}
function roomTitle(value:unknown){if(typeof value!=='string')return null;return rooms.find(room=>room.id===value)?.title??null}
function chatRoleTitle(room:Room){return room.id==='central'?'محافظ البنك المركزي':room.lead}
function chatEntityTitle(room:Room){return room.id==='central'?'بنك نماء المركزي':room.title}
function missingLabel(value:string){if(value==='monthly_net_income')return 'الدخل الشهري الصافي';if(value==='recurring_core_obligations')return 'الالتزامات الأساسية';if(value==='financing_purpose')return 'غرض التمويل';if(value==='requested_amount')return 'مبلغ التمويل';if(value==='expected_installment')return 'القسط الشهري المتوقع';return value}

function RoomPortrait({room,size='md'}:{room:Room;size?:'sm'|'md'|'lg'}) {
  return <span className={`${styles.personaAvatar} ${styles[`persona_${size}`]} ${room.id==='central'?styles.centralPersona:''}`} aria-hidden="true">
    <Image src={room.avatar} alt="" fill sizes="(max-width: 767px) 40px, 48px" />
    <span className={styles.bankBadge}><Image src={room.bankLogo} alt="" fill sizes="24px" /></span>
  </span>;
}

const onboardingStepNumber:Record<string,number>={
  marital_status:1,dependents:2,home_city:3,housing:4,employment:5,work_city:6,
  commute:7,income:8,accounts:9,obligations:10,goals:11,statements:12,review:13,
};

function OnboardingMessageContent({message}:{message:Message}){
  const data=message.structured_data&&typeof message.structured_data==='object'?message.structured_data:{};
  const question=typeof data.next_question==='string'?data.next_question.trim():'';
  const step=typeof data.onboarding_step==='string'?data.onboarding_step:'';
  const stepNumber=onboardingStepNumber[step];
  const body=message.body.trim();
  const intro=question&&body.endsWith(question)?body.slice(0,Math.max(0,body.length-question.length)).trim():body;
  return <div className={styles.onboardingMessageContent}>
    {intro&&intro!==question&&<p>{intro}</p>}
    {question&&<div className={styles.onboardingQuestionBox}>
      {stepNumber&&<span>السؤال {stepNumber}</span>}
      <strong>{question}</strong>
    </div>}
    {!question&&<p>{body}</p>}
  </div>;
}

function StructuredFacts({data}:{data?:Record<string,unknown>}){
  if(!data)return null;
  const confidence=typeof data.confidence_percent==='number'?data.confidence_percent:null;
  const routed=roomTitle(data.routed_room);
  const metrics=data.financial_metrics&&typeof data.financial_metrics==='object'?data.financial_metrics as Record<string,unknown>:null;
  const missing=Array.isArray(data.missing_fields)?data.missing_fields.filter((item):item is string=>typeof item==='string'):[];
  const income=metrics&&typeof metrics.monthly_net_income==='number'?metrics.monthly_net_income:null;
  const obligations=metrics&&typeof metrics.recurring_core_obligations_total==='number'?metrics.recurring_core_obligations_total:null;
  const margin=metrics&&typeof metrics.safety_margin==='number'?metrics.safety_margin:null;
  const ratio=metrics&&typeof metrics.obligation_ratio==='number'?metrics.obligation_ratio:null;
  const goalName=typeof data.goal_name==='string'?data.goal_name:null;
  const goalAmount=typeof data.target_amount==='number'?data.target_amount:null;
  const goalDate=typeof data.target_date==='string'?data.target_date:null;
  const funding=typeof data.funding_source==='string'?data.funding_source:null;
  const safeCapacity=typeof data.safe_capacity==='number'?data.safe_capacity:typeof data.safe_capacity_after_goal==='number'?data.safe_capacity_after_goal:null;
  const capacityBefore=typeof data.safe_capacity_before_goal==='number'?data.safe_capacity_before_goal:null;
  const capacityReduction=typeof data.safe_capacity_reduction==='number'?data.safe_capacity_reduction:null;
  const goalReserve=typeof data.reserved_near_goal_total_after==='number'?data.reserved_near_goal_total_after:typeof data.near_goal_reserve_total==='number'?data.near_goal_reserve_total:null;
  const dated=typeof data.reserved_dated_obligations_total==='number'?data.reserved_dated_obligations_total:null;
  const requested=typeof data.requested_amount==='number'?data.requested_amount:null;
  const remaining=typeof data.remaining_safe_capacity==='number'?data.remaining_safe_capacity:null;
  const gap=typeof data.commitment_gap_after==='number'?data.commitment_gap_after:typeof data.commitment_gap==='number'?data.commitment_gap:null;
  const blocked=typeof data.blocked==='boolean'?data.blocked:null;
  const financingPurpose=typeof data.financing_purpose==='string'?data.financing_purpose:null;
  const installment=typeof data.expected_installment==='number'?data.expected_installment:null;
  const obligationsAfter=typeof data.obligations_after_installment==='number'?data.obligations_after_installment:null;
  const financingRatio=typeof data.obligation_ratio_after==='number'?data.obligation_ratio_after:null;
  const financingMargin=typeof data.monthly_margin_after==='number'?data.monthly_margin_after:null;
  const decisionState=typeof data.decision_state==='string'?data.decision_state:null;
  const protectionGate=typeof data.protection_gate_state==='string'?data.protection_gate_state:null;
  const eligibilityScore=typeof data.eligibility_score==='number'?data.eligibility_score:null;
  const eligibilityBand=typeof data.eligibility_band==='string'?data.eligibility_band:null;
  const financeLimitComponents=data.finance_limit_components&&typeof data.finance_limit_components==='object'?data.finance_limit_components as Record<string,unknown>:null;
  const financeLimit=financeLimitComponents&&typeof financeLimitComponents.finance_limit==='number'?financeLimitComponents.finance_limit:null;
  const financingGate=data.financing_gate&&typeof data.financing_gate==='object'?data.financing_gate as Record<string,unknown>:null;
  const financingBlockReasons=financingGate&&Array.isArray(financingGate.block_reasons)?financingGate.block_reasons.filter((item):item is string=>typeof item==='string'):[];
  const missingLimit=financeLimitComponents&&Array.isArray(financeLimitComponents.missing_limit_components)?financeLimitComponents.missing_limit_components.filter((item):item is string=>typeof item==='string'):[];
  const calibrationStatus=typeof data.calibration_status==='string'?data.calibration_status:null;
  const eligibilityCalibration=data.eligibility_calibration&&typeof data.eligibility_calibration==='object'?data.eligibility_calibration as Record<string,unknown>:null;
  const eligibilityCalibrationId=eligibilityCalibration&&typeof eligibilityCalibration.calibration_id==='string'?eligibilityCalibration.calibration_id:null;
  const eligibilityReadiness=eligibilityCalibration&&eligibilityCalibration.readiness&&typeof eligibilityCalibration.readiness==='object'?eligibilityCalibration.readiness as Record<string,unknown>:null;
  const eligibilityWeightVersion=eligibilityReadiness&&typeof eligibilityReadiness.baseline_weights_version==='string'?eligibilityReadiness.baseline_weights_version:null;
  const eligibilityBlockers=eligibilityReadiness&&Array.isArray(eligibilityReadiness.activation_blockers)?eligibilityReadiness.activation_blockers.filter((x):x is string=>typeof x==='string'):[];
  const repaymentBand=data.repayment_installment_band&&typeof data.repayment_installment_band==='object'?data.repayment_installment_band as Record<string,unknown>:null;
  const repaymentMin=repaymentBand&&typeof repaymentBand.min_installment_from_safe_savings==='number'?repaymentBand.min_installment_from_safe_savings:null;
  const repaymentMax=repaymentBand&&typeof repaymentBand.max_installment_from_safe_savings==='number'?repaymentBand.max_installment_from_safe_savings:null;
  const repaymentEvidence=data.repayment_capacity_evidence&&typeof data.repayment_capacity_evidence==='object'?data.repayment_capacity_evidence as Record<string,unknown>:null;
  const realizedSalary=repaymentEvidence&&typeof repaymentEvidence.realized_salary_income==='number'?repaymentEvidence.realized_salary_income:null;
  const repaymentCapacity=repaymentEvidence&&typeof repaymentEvidence.repayment_capacity==='number'?repaymentEvidence.repayment_capacity:null;
  const conservativeIncome=repaymentEvidence&&typeof repaymentEvidence.conservative_income_basis==='number'?repaymentEvidence.conservative_income_basis:null;
  const policyCapEvidence=data.policy_cap_evidence&&typeof data.policy_cap_evidence==='object'?data.policy_cap_evidence as Record<string,unknown>:null;
  const policyCategory=policyCapEvidence&&typeof policyCapEvidence.category_name==='string'?policyCapEvidence.category_name:null;
  const policyPlanned=policyCapEvidence&&typeof policyCapEvidence.planned_amount_current_cycle==='number'?policyCapEvidence.planned_amount_current_cycle:null;
  const policyActual=policyCapEvidence&&typeof policyCapEvidence.actual_spend_current_cycle==='number'?policyCapEvidence.actual_spend_current_cycle:null;
  const policyAverage=policyCapEvidence&&typeof policyCapEvidence.historical_average_spend==='number'?policyCapEvidence.historical_average_spend:null;
  const policyCapStatus=policyCapEvidence&&typeof policyCapEvidence.policy_cap_status==='string'?policyCapEvidence.policy_cap_status:null;
  const exposureProfile=policyCapEvidence&&policyCapEvidence.exposure_profile&&typeof policyCapEvidence.exposure_profile==='object'?policyCapEvidence.exposure_profile as Record<string,unknown>:null;
  const exposureCases=exposureProfile&&typeof exposureProfile.total_case_count==='number'?exposureProfile.total_case_count:null;
  const outstandingExposure=exposureProfile&&typeof exposureProfile.outstanding_exposure==='number'?exposureProfile.outstanding_exposure:null;
  const plannedRepayment=exposureProfile&&typeof exposureProfile.planned_repayment_total==='number'?exposureProfile.planned_repayment_total:null;
  const overdueExposure=exposureProfile&&typeof exposureProfile.overdue_planned_amount==='number'?exposureProfile.overdue_planned_amount:null;
  const overdueInstallments=exposureProfile&&typeof exposureProfile.overdue_installment_count==='number'?exposureProfile.overdue_installment_count:null;
  const policyGovernance=data.policy_cap_governance&&typeof data.policy_cap_governance==='object'?data.policy_cap_governance as Record<string,unknown>:null;
  const policySignals=policyGovernance&&policyGovernance.signals&&typeof policyGovernance.signals==='object'?policyGovernance.signals as Record<string,unknown>:null;
  const policyHardStop=policyGovernance&&typeof policyGovernance.hard_stop==='boolean'?policyGovernance.hard_stop:null;
  const policyGovernanceStatus=policyGovernance&&typeof policyGovernance.status==='string'?policyGovernance.status:null;
  const policyCapCalibration=data.policy_cap_calibration&&typeof data.policy_cap_calibration==='object'?data.policy_cap_calibration as Record<string,unknown>:null;
  const policyCapCalibrationStatus=policyCapCalibration&&typeof policyCapCalibration.status==='string'?policyCapCalibration.status:null;
  const policyCapCalibrationId=policyCapCalibration&&typeof policyCapCalibration.calibration_id==='string'?policyCapCalibration.calibration_id:null;
  const policyCapReadiness=policyCapCalibration&&policyCapCalibration.readiness&&typeof policyCapCalibration.readiness==='object'?policyCapCalibration.readiness as Record<string,unknown>:null;
  const policyCapWeightVersion=policyCapReadiness&&typeof policyCapReadiness.baseline_weights_version==='string'?policyCapReadiness.baseline_weights_version:null;
  const policyCapBlockers=policyCapReadiness&&Array.isArray(policyCapReadiness.activation_blockers)?policyCapReadiness.activation_blockers.filter((x):x is string=>typeof x==='string'):[];
  const exposureIncomeRatio=policySignals&&typeof policySignals.exposure_to_realized_income_ratio==='number'?policySignals.exposure_to_realized_income_ratio:null;
  const utilizationRatio=policySignals&&typeof policySignals.category_utilization_ratio==='number'?policySignals.category_utilization_ratio:null;
  const financingFrequency=policySignals&&typeof policySignals.financing_frequency==='number'?policySignals.financing_frequency:null;
  const restructuringTotal=policySignals&&typeof policySignals.restructuring_applied_count_total==='number'?policySignals.restructuring_applied_count_total:null;
  const restructuringMax=policySignals&&typeof policySignals.restructuring_max_applied_per_case==='number'?policySignals.restructuring_max_applied_per_case:null;
  const restructuringCapReached=policySignals&&typeof policySignals.restructuring_precautionary_cap_reached==='boolean'?policySignals.restructuring_precautionary_cap_reached:null;
  const restructuringState=typeof data.restructuring_state==='string'?data.restructuring_state:null;
  const restructuringRootCause=typeof data.root_cause==='string'?data.root_cause:null;
  const proposedPlan=data.proposed_plan&&typeof data.proposed_plan==='object'?data.proposed_plan as Record<string,unknown>:null;
  const proposedMonthly=proposedPlan&&typeof proposedPlan.proposed_monthly_repayment==='number'?proposedPlan.proposed_monthly_repayment:null;
  const proposedCycles=proposedPlan&&typeof proposedPlan.proposed_cycles==='number'?proposedPlan.proposed_cycles:null;
  const proposalRemaining=proposedPlan&&typeof proposedPlan.remaining_amount==='number'?proposedPlan.remaining_amount:null;
  const restructuringApplied=typeof data.applied_restructuring_count==='number'?data.applied_restructuring_count:null;
  const evidenceVerification=data.evidence_verification&&typeof data.evidence_verification==='object'?data.evidence_verification as Record<string,unknown>:null;
  const evidenceMatchedAmount=evidenceVerification&&typeof evidenceVerification.matched_amount==='number'?evidenceVerification.matched_amount:null;
  const evidenceMatchedDate=evidenceVerification&&typeof evidenceVerification.matched_transaction_date==='string'?evidenceVerification.matched_transaction_date:null;
  const evidenceMatchedAccount=evidenceVerification&&typeof evidenceVerification.matched_account_name==='string'?evidenceVerification.matched_account_name:null;
  const evidenceMatchedRow=evidenceVerification&&typeof evidenceVerification.matched_statement_row_id==='string'?evidenceVerification.matched_statement_row_id:null;
  const recoveryFollowup=data.recovery_followup&&typeof data.recovery_followup==='object'?data.recovery_followup as Record<string,unknown>:null;
  const recoveryOutstanding=recoveryFollowup&&typeof recoveryFollowup.outstanding_exposure==='number'?recoveryFollowup.outstanding_exposure:null;
  const recoveryOverdueCount=recoveryFollowup&&typeof recoveryFollowup.overdue_installment_count==='number'?recoveryFollowup.overdue_installment_count:null;
  const recoveryOverdueAmount=recoveryFollowup&&typeof recoveryFollowup.overdue_planned_amount==='number'?recoveryFollowup.overdue_planned_amount:null;
  const recoveryHardStop=recoveryFollowup&&typeof recoveryFollowup.hard_stop==='boolean'?recoveryFollowup.hard_stop:null;
  const recoveryTrigger=recoveryFollowup&&typeof recoveryFollowup.trigger==='string'?recoveryFollowup.trigger:null;
  const decisionLifecycle=data.decision_lifecycle&&typeof data.decision_lifecycle==='object'?data.decision_lifecycle as Record<string,unknown>:null;
  const decisionReference=decisionLifecycle&&typeof decisionLifecycle.decision_reference==='string'?decisionLifecycle.decision_reference:null;
  const decisionLifecycleState=decisionLifecycle&&typeof decisionLifecycle.state==='string'?decisionLifecycle.state:null;
  if(confidence===null&&!routed&&income===null&&!missing.length&&!goalName&&safeCapacity===null&&requested===null&&!financingPurpose&&!decisionState&&eligibilityScore===null&&!calibrationStatus&&!decisionReference)return null;
  return <div className={styles.facts}>
    {decisionReference&&<span><small>مرجع القرار</small><strong>{decisionReference}</strong></span>}
    {decisionLifecycleState&&<span><small>حالة دورة القرار</small><strong>{decisionLifecycleState==='PROPOSED'?'مقترح':decisionLifecycleState==='REVIEWED'?'تحت المراجعة':decisionLifecycleState==='USER_CONFIRMED'?'أكد المستخدم':decisionLifecycleState==='EVIDENCE_REQUIRED'?'بانتظار الإثبات':decisionLifecycleState==='VERIFIED'?'تم التحقق':decisionLifecycleState==='APPLIED'?'تم التحقق من التطبيق':decisionLifecycleState==='FOLLOWUP'?'متابعة بعد القرار':decisionLifecycleState==='BLOCKED'?'متوقف بحاجز حاكم':decisionLifecycleState==='CANCELLED'?'ملغى':decisionLifecycleState}</strong></span>}
    {confidence!==null&&<span><small>درجة الثقة</small><strong>{confidence}٪</strong></span>}
    {routed&&<span><small>الجهة المختصة</small><strong>{routed}</strong></span>}
    {income!==null&&<span><small>الدخل المؤكد</small><strong>{formatSar(income)} ر.س</strong></span>}
    {obligations!==null&&<span><small>الالتزامات المؤكدة</small><strong>{formatSar(obligations)} ر.س</strong></span>}
    {margin!==null&&<span><small>الهامش الأولي</small><strong>{formatSar(margin)} ر.س</strong></span>}
    {ratio!==null&&<span><small>نسبة الالتزامات</small><strong>{(ratio*100).toFixed(1)}٪</strong></span>}
    {goalName&&<span><small>الهدف</small><strong>{goalName}</strong></span>}
    {goalAmount!==null&&<span><small>قيمة الهدف</small><strong>{formatSar(goalAmount)} ر.س</strong></span>}
    {goalDate&&<span><small>موعد الهدف</small><strong>{goalDate}</strong></span>}
    {funding&&<span><small>مصدر الهدف</small><strong>{funding==='PROTECTED_POOL'?'أموال الحماية / السيولة الحالية':'مصدر خارجي أو دخل مستقبلي'}</strong></span>}
    {capacityBefore!==null&&<span><small>السعة قبل الهدف</small><strong>{formatSar(capacityBefore)} ر.س</strong></span>}
    {safeCapacity!==null&&<span><small>السعة الآمنة الحالية</small><strong>{formatSar(safeCapacity)} ر.س</strong></span>}
    {capacityReduction!==null&&<span><small>أثر الهدف على السعة</small><strong>-{formatSar(capacityReduction)} ر.س</strong></span>}
    {goalReserve!==null&&<span><small>محجوز للأهداف القريبة</small><strong>{formatSar(goalReserve)} ر.س</strong></span>}
    {dated!==null&&<span><small>التزامات مؤرخة محجوزة</small><strong>{formatSar(dated)} ر.س</strong></span>}
    {requested!==null&&<span><small>المبلغ قيد الدراسة</small><strong>{formatSar(requested)} ر.س</strong></span>}
    {remaining!==null&&<span><small>السعة بعد الطلب</small><strong>{formatSar(remaining)} ر.س</strong></span>}
    {gap!==null&&gap>0&&<span><small>فجوة الحماية</small><strong>{formatSar(gap)} ر.س</strong></span>}
    {blocked!==null&&<span><small>حالة الحاجز</small><strong>{blocked?'متوقف لحماية الالتزامات':'اجتاز الحماية فقط'}</strong></span>}
    {financingPurpose&&<span><small>غرض التمويل</small><strong>{financingPurpose}</strong></span>}
    {installment!==null&&<span><small>القسط المتوقع</small><strong>{formatSar(installment)} ر.س</strong></span>}
    {obligationsAfter!==null&&<span><small>الالتزامات بعد القسط</small><strong>{formatSar(obligationsAfter)} ر.س</strong></span>}
    {financingRatio!==null&&<span><small>نسبة الالتزامات بعد القسط</small><strong>{(financingRatio*100).toFixed(1)}٪</strong></span>}
    {financingMargin!==null&&<span><small>الهامش الشهري بعد القسط</small><strong>{formatSar(financingMargin)} ر.س</strong></span>}
    {protectionGate&&<span><small>حاجز الحماية</small><strong>{protectionGate==='PASSES_PROTECTION_GATE'?'اجتاز الحماية فقط':protectionGate}</strong></span>}
    {decisionState&&<span><small>حالة دراسة التمويل</small><strong>{decisionState==='NEEDS_DATA'?'تحتاج بيانات':decisionState==='BLOCKED'?'متوقفة':decisionState==='UNDER_REVIEW'?'تحت المراجعة':decisionState}</strong></span>}
    {eligibilityScore!==null&&<span><small>درجة أهلية الهلال</small><strong>{eligibilityScore.toFixed(1)} / 100</strong></span>}
    {eligibilityBand&&<span><small>فئة الأهلية</small><strong>{eligibilityBand==='ELIGIBLE_WITHIN_LIMIT'?'مؤهل داخل السقف':eligibilityBand==='ELIGIBLE_WITH_CONDITIONS'?'مؤهل بشروط أو مبلغ أقل':eligibilityBand==='RESTRICTED'?'مقيد':'مرفوض'}</strong></span>}
    {financeLimit!==null&&<span><small>سقف التمويل المحسوب</small><strong>{formatSar(financeLimit)} ر.س</strong></span>}
    {financingBlockReasons.length>0&&<span><small>أسباب إيقاف التمويل</small><strong>{financingBlockReasons.map(item=>item==='SAFE_CAPACITY_EXCEEDED'?'المبلغ يتجاوز السعة الآمنة':item==='PROTECTION_COMMITMENT_GAP'?'فجوة في تغطية الالتزامات المحمية':item==='FINANCE_LIMIT_EXCEEDED'?'المبلغ يتجاوز سقف التمويل الحاكم':item==='INSTALLMENT_ABOVE_APPROVED_BAND'?'القسط يتجاوز النطاق المعتمد من الوفر الآمن':item==='OVERDUE_REPAYMENT_HARD_STOP'?'يوجد استرداد متأخر يوقف التمويل الجديد':item==='ELIGIBILITY_REJECTED'?'معايرة الأهلية الحاكمة صنفت الطلب مرفوضًا':item).join('، ')}</strong></span>}
    {missingLimit.length>0&&<span><small>مكونات سقف ناقصة</small><strong>{missingLimit.join('، ')}</strong></span>}
    {repaymentMin!==null&&repaymentMax!==null&&<span><small>نطاق القسط من الوفر الآمن</small><strong>{formatSar(repaymentMin)}–{formatSar(repaymentMax)} ر.س</strong></span>}
    {realizedSalary!==null&&<span><small>راتب متحقق في الدورة</small><strong>{formatSar(realizedSalary)} ر.س</strong></span>}
    {conservativeIncome!==null&&<span><small>أساس الدخل المتحفظ</small><strong>{formatSar(conservativeIncome)} ر.س</strong></span>}
    {repaymentCapacity!==null&&<span><small>قدرة السداد قبل التسعير</small><strong>{formatSar(repaymentCapacity)} ر.س</strong></span>}
    {policyCategory&&<span><small>بند التمويل</small><strong>{policyCategory}</strong></span>}
    {policyPlanned!==null&&<span><small>مخصص البند الحالي</small><strong>{formatSar(policyPlanned)} ر.س</strong></span>}
    {policyActual!==null&&<span><small>إنفاق البند الحالي</small><strong>{formatSar(policyActual)} ر.س</strong></span>}
    {policyAverage!==null&&<span><small>متوسط الإنفاق التاريخي</small><strong>{formatSar(policyAverage)} ر.س</strong></span>}
    {policyCapStatus&&<span><small>POLICY_CAP</small><strong>{policyCapStatus==='NUMERIC_CALIBRATION_REQUIRED'?'بانتظار معايرة رقمية معتمدة':policyCapStatus}</strong></span>}
    {policyCapCalibrationStatus&&<span><small>معايرة POLICY_CAP</small><strong>{policyCapCalibrationStatus==='CALIBRATION_NOT_GOVERNING'?'غير مفعلة حاكمًا':policyCapCalibrationStatus==='CALIBRATED'?'مفعلة ومعتمدة':policyCapCalibrationStatus}</strong></span>}
    {policyCapCalibrationId&&<span><small>إصدار معايرة POLICY_CAP</small><strong>{policyCapCalibrationId}</strong></span>}
    {policyCapWeightVersion&&<span><small>مرجع أوزان الهلال</small><strong>{policyCapWeightVersion}</strong></span>}
    {policyCapBlockers.length>0&&<span><small>متطلبات التفعيل الحاكم</small><strong>{policyCapBlockers.join('، ')}</strong></span>}
    {exposureCases!==null&&<span><small>عدد تمويلات البند</small><strong>{exposureCases}</strong></span>}
    {outstandingExposure!==null&&<span><small>التعرض القائم للبند</small><strong>{formatSar(outstandingExposure)} ر.س</strong></span>}
    {plannedRepayment!==null&&<span><small>استرداد مخطط قائم</small><strong>{formatSar(plannedRepayment)} ر.س</strong></span>}
    {overdueExposure!==null&&overdueExposure>0&&<span><small>استرداد متأخر</small><strong>{formatSar(overdueExposure)} ر.س</strong></span>}
    {overdueInstallments!==null&&overdueInstallments>0&&<span><small>دفعات متأخرة</small><strong>{overdueInstallments}</strong></span>}
    {utilizationRatio!==null&&<span><small>استخدام مخصص البند</small><strong>{(utilizationRatio*100).toFixed(1)}٪</strong></span>}
    {exposureIncomeRatio!==null&&<span><small>التعرض إلى الدخل المتحقق</small><strong>{(exposureIncomeRatio*100).toFixed(1)}٪</strong></span>}
    {financingFrequency!==null&&<span><small>تكرار تمويل البند</small><strong>{financingFrequency}</strong></span>}
    {restructuringTotal!==null&&<span><small>إعادات الجدولة المطبقة</small><strong>{restructuringTotal}</strong></span>}
    {restructuringMax!==null&&<span><small>أعلى إعادة جدولة لتمويل واحد</small><strong>{restructuringMax} / 3</strong></span>}
    {restructuringCapReached===true&&<span><small>سقف إعادة الجدولة</small><strong>بلغ السقف الاحترازي</strong></span>}
    {restructuringState&&<span><small>حالة إعادة الجدولة</small><strong>{restructuringState==='PROPOSAL_READY'?'مقترح جاهز للتأكيد':restructuringState==='APPROVED_NOT_APPLIED'?'معتمد داخليًا — غير مطبق':restructuringState==='EVIDENCE_REQUIRED'?'بانتظار إثبات التنفيذ':restructuringState==='EVIDENCE_NOT_VERIFIED'?'الإثبات غير متحقق':restructuringState==='APPLIED'?'تم التحقق والتطبيق':restructuringState==='MIGRATION_REQUIRED'?'السجل يحتاج ترحيل قاعدة البيانات':restructuringState==='PRECAUTIONARY_CAP_REACHED'?'بلغ السقف الاحترازي':restructuringState}</strong></span>}
    {restructuringRootCause&&<span><small>سبب إعادة الجدولة</small><strong>{restructuringRootCause}</strong></span>}
    {proposalRemaining!==null&&<span><small>الرصيد المتبقي لإعادة الجدولة</small><strong>{formatSar(proposalRemaining)} ر.س</strong></span>}
    {proposedMonthly!==null&&<span><small>القسط المقترح الجديد</small><strong>{formatSar(proposedMonthly)} ر.س</strong></span>}
    {proposedCycles!==null&&<span><small>الدورات المقترحة</small><strong>{proposedCycles}</strong></span>}
    {restructuringApplied!==null&&<span><small>إعادات الجدولة المطبقة للتمويل</small><strong>{restructuringApplied} / 3</strong></span>}
    {evidenceMatchedAmount!==null&&<span><small>مبلغ الإثبات المتحقق</small><strong>{formatSar(evidenceMatchedAmount)} ر.س</strong></span>}
    {evidenceMatchedDate&&<span><small>تاريخ الإثبات المتحقق</small><strong>{evidenceMatchedDate}</strong></span>}
    {evidenceMatchedAccount&&<span><small>حساب الإثبات</small><strong>{evidenceMatchedAccount}</strong></span>}
    {evidenceMatchedRow&&<span><small>مرجع صف الكشف</small><strong>{evidenceMatchedRow}</strong></span>}
    {recoveryOutstanding!==null&&<span><small>التعرض بعد إعادة الحساب</small><strong>{formatSar(recoveryOutstanding)} ر.س</strong></span>}
    {recoveryOverdueCount!==null&&recoveryOverdueCount>0&&<span><small>دفعات متأخرة بعد إعادة الحساب</small><strong>{recoveryOverdueCount}</strong></span>}
    {recoveryOverdueAmount!==null&&recoveryOverdueAmount>0&&<span><small>قيمة التأخر بعد إعادة الحساب</small><strong>{formatSar(recoveryOverdueAmount)} ر.س</strong></span>}
    {recoveryTrigger&&<span><small>سبب إعادة الحساب</small><strong>{recoveryTrigger==='PAYMENT_RECORDED'?'سداد مسجل':'مراجعة التأخر الدورية'}</strong></span>}
    {recoveryHardStop===true&&<span><small>تمويل جديد</small><strong>متوقف حتى معالجة التأخر</strong></span>}
    {policyGovernanceStatus&&<span><small>حوكمة POLICY_CAP</small><strong>{policyGovernanceStatus==='HARD_STOP_OVERDUE'?'متوقف بسبب استرداد متأخر':policyGovernanceStatus==='NUMERIC_CALIBRATION_REQUIRED'?'إشارات مكتملة — المعايرة الرقمية مطلوبة':policyGovernanceStatus}</strong></span>}
    {policyHardStop===true&&<span><small>منع تمويل جديد</small><strong>مفعل حتى معالجة التأخر</strong></span>}
    {calibrationStatus&&<span><small>معايرة الأهلية</small><strong>{calibrationStatus==='CALIBRATION_NOT_GOVERNING'?'غير مفعلة حاكمًا':calibrationStatus==='CALIBRATION_GOVERNANCE_INCOMPLETE'?'حوكمتها غير مكتملة':calibrationStatus==='SCORED'?'مفعلة ومعتمدة':calibrationStatus}</strong></span>}
    {eligibilityCalibrationId&&<span><small>إصدار معايرة الأهلية</small><strong>{eligibilityCalibrationId}</strong></span>}
    {eligibilityWeightVersion&&<span><small>مرجع أوزان الأهلية</small><strong>{eligibilityWeightVersion}</strong></span>}
    {eligibilityBlockers.length>0&&<span><small>متطلبات تفعيل الأهلية</small><strong>{eligibilityBlockers.map(item=>item==='HISTORICAL_VALIDATION_REQUIRED'?'التحقق التاريخي':item==='FINAL_GOVERNANCE_APPROVAL_REQUIRED'?'الاعتماد النهائي':item==='EFFECTIVE_DATE_REQUIRED'?'تاريخ النفاذ':item==='FACTOR_TO_SCORE_MAPPING_REQUIRED'?'خرائط تحويل العوامل إلى درجات':item).join('، ')}</strong></span>}
    {missing.length>0&&<span><small>بيانات ناقصة</small><strong>{missing.map(missingLabel).join('، ')}</strong></span>}
  </div>;
}

export function PersistentConversationWorkspace(){
  const router=useRouter();
  const [activeRoomId,setActiveRoomId]=useState<RoomKey>('central');
  const [loadedRoomId,setLoadedRoomId]=useState<RoomKey|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [participants,setParticipants]=useState<Participant[]>([]);
  const [draft,setDraft]=useState('');
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [roomsOpen,setRoomsOpen]=useState(false);
  const [contextOpen,setContextOpen]=useState(false);
  const [mobileRoomList,setMobileRoomList]=useState(false);
  const [onboardingComplete,setOnboardingComplete]=useState<boolean|null>(null);
  const [onboardingStep,setOnboardingStep]=useState<string|null>(null);
  const [statementAccounts,setStatementAccounts]=useState<StatementAccount[]>([]);
  const [statementAccountId,setStatementAccountId]=useState('');
  const [statementPickerOpen,setStatementPickerOpen]=useState(false);
  const [statementUploading,setStatementUploading]=useState(false);
  const [statementReviewVersion,setStatementReviewVersion]=useState(0);
  const statementFileRef=useRef<HTMLInputElement|null>(null);
  const [profile,setProfile]=useState<UserProfile|null>(null);
  const [userMenuOpen,setUserMenuOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [settingsSection,setSettingsSection]=useState<'general'|'accounts'>('general');
  const [profileName,setProfileName]=useState('');
  const [profileSaving,setProfileSaving]=useState(false);
  const [reviewOpen,setReviewOpen]=useState(false);
  const [reviewFacts,setReviewFacts]=useState<OnboardingReviewFact[]>([]);
  const [reviewEditingKey,setReviewEditingKey]=useState('');
  const [reviewDraft,setReviewDraft]=useState('');
  const [reviewSaving,setReviewSaving]=useState(false);
  const [attachments,setAttachments]=useState<ConversationAttachment[]>([]);
  const [detailRoomId,setDetailRoomId]=useState<RoomKey|null>(null);
  const composerTextareaRef=useRef<HTMLTextAreaElement|null>(null);
  const [desktopRoomsVisible,setDesktopRoomsVisible]=useState(true);
  const [desktopContextVisible,setDesktopContextVisible]=useState(true);
  const activeRoom=useMemo(()=>rooms.find(r=>r.id===activeRoomId)??rooms[0],[activeRoomId]);
  const loading=loadedRoomId!==activeRoomId;

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/account/profile',{cache:'no-store'})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{
        if(cancelled||!data?.user)return;
        setProfile(data.user as UserProfile);
        setProfileName(String(data.user.name??''));
      })
      .catch(()=>{});
    return()=>{cancelled=true};
  },[]);

  useEffect(()=>{ let cancelled=false; fetch(`/api/conversations/${activeRoomId}`,{cache:'no-store'})
    .then(async response=>{ if(!response.ok) throw new Error('تعذر تحميل المحادثة.'); return response.json(); })
    .then(data=>{ if(!cancelled){
      setMessages(Array.isArray(data.messages)?data.messages:[]);
      setParticipants(Array.isArray(data.participants)?data.participants:[]);
    setAttachments(Array.isArray(data.attachments)?data.attachments:[]);
      setAttachments(Array.isArray(data.attachments)?data.attachments:[]);
      const onboarding=(data.onboarding??null) as OnboardingStatus|null;
      if(onboarding){
        setOnboardingComplete(Boolean(onboarding.complete));
        setOnboardingStep(onboarding.current_step??null);
        if(activeRoomId==='central' && onboarding.complete) setMobileRoomList(true);
        if(!onboarding.complete && activeRoomId!=='central') setActiveRoomId('central');
      }
      setLoadedRoomId(activeRoomId);
    } })
    .catch(()=>{ if(!cancelled){ setError('تعذر تحميل المحادثة الآن. حاول مرة أخرى.'); setLoadedRoomId(activeRoomId); } }); return()=>{cancelled=true}; },[activeRoomId]);

  function chooseRoom(id:RoomKey){if(onboardingComplete===false&&id!=='central')return;setError('');setActiveRoomId(id);setRoomsOpen(false);setMobileRoomList(false)}

  async function refreshActiveRoom(){
    const response=await fetch(`/api/conversations/${activeRoomId}`,{cache:'no-store'});
    if(!response.ok) return;
    const data=await response.json();
    setMessages(Array.isArray(data.messages)?data.messages:[]);
    setParticipants(Array.isArray(data.participants)?data.participants:[]);
    const onboarding=(data.onboarding??null) as OnboardingStatus|null;
    if(onboarding){
      setOnboardingComplete(Boolean(onboarding.complete));
      setOnboardingStep(onboarding.current_step??null);
    }
  }

  async function prepareStatementUpload(){
    if(activeRoomId!=='central'){
      setError('رفع كشف الحساب مرتبط حاليًا بمحافظ بنك نماء المركزي.');
      return;
    }
    setError('');
    try{
      const response=await fetch('/api/conversations/central/statement',{cache:'no-store'});
      const data=await response.json() as {accounts?:StatementAccount[]};
      if(!response.ok) throw new Error('accounts');
      const accounts=Array.isArray(data.accounts)?data.accounts:[];
      if(!accounts.length){
        setError('أضف حسابًا ماليًا في التأسيس أولًا حتى أعرف لأي حساب ينتمي الكشف.');
        return;
      }
      setStatementAccounts(accounts);
      if(accounts.length===1){
        setStatementAccountId(accounts[0]?.id??'');
        setStatementPickerOpen(false);
        statementFileRef.current?.click();
      }else{
        setStatementAccountId(current=>current||accounts[0]?.id||'');
        setStatementPickerOpen(true);
      }
    }catch{
      setError('تعذر تجهيز رفع كشف الحساب الآن. حاول مرة أخرى.');
    }
  }

  async function uploadStatement(file:File){
    if(!statementAccountId) return;
    setStatementUploading(true);
    setError('');
    try{
      const form=new FormData();
      form.set('file',file);
      form.set('account_id',statementAccountId);
      const response=await fetch('/api/conversations/central/statement',{method:'POST',body:form});
      const data=await response.json() as {code?:string;row_count?:number};
      if(!response.ok){
        const message=data.code==='STATEMENT_CSV_ONLY'
          ? 'الرفع الحالي يقبل CSV فقط.'
          : data.code==='STATEMENT_DIRECTION_COLUMN_REQUIRED'
            ? 'الكشف يحتاج عمود اتجاه الحركة أو أعمدة خصم/إيداع.'
            : data.code==='STATEMENT_DESCRIPTION_COLUMN_REQUIRED'
              ? 'لم أجد عمود وصف الحركة في الملف.'
              : data.code==='STATEMENT_CSV_NO_VALID_ROWS'
                ? 'لم أجد حركات صالحة للمراجعة في الكشف.'
                : 'تعذر استيراد كشف الحساب. راجع الملف وحاول مرة أخرى.';
        setError(message);
        return;
      }
      setStatementPickerOpen(false);
      setStatementReviewVersion(version=>version+1);
      await refreshActiveRoom();
    }catch{
      setError('تعذر رفع كشف الحساب الآن. لم تُنشأ أي حركة مالية.');
    }finally{
      setStatementUploading(false);
      if(statementFileRef.current) statementFileRef.current.value='';
    }
  }

  async function saveProfile(){
    const name=profileName.trim();
    if(!profile||name.length<2||profileSaving)return;
    setProfileSaving(true);
    try{
      const response=await fetch('/api/account/profile',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({name}),
      });
      const data=await response.json() as {user?:UserProfile};
      if(!response.ok||!data.user) throw new Error('profile');
      setProfile(data.user);
      setProfileName(data.user.name);
      setProfileOpen(false);
    }catch{
      setError('تعذر حفظ بيانات المستخدم الآن.');
    }finally{
      setProfileSaving(false);
    }
  }

  async function logout(){
    try{
      await fetch('/api/auth/logout',{method:'POST'});
    }finally{
      router.push('/login');
      router.refresh();
    }
  }

  async function openAccountsSettings(){
    setRoomsOpen(false);
    setSettingsSection('accounts');
    setSettingsOpen(true);
    try{
      const response=await fetch('/api/conversations/central/statement',{cache:'no-store'});
      const data=await response.json() as {accounts?:StatementAccount[]};
      if(response.ok) setStatementAccounts(Array.isArray(data.accounts)?data.accounts:[]);
    }catch{
      setError('تعذر تحميل الحسابات الآن.');
    }
  }

  async function openOnboardingReview(){
    setReviewOpen(true);
    setReviewEditingKey('');
    setReviewDraft('');
    try{
      const response=await fetch('/api/onboarding/review',{cache:'no-store'});
      const data=await response.json() as {facts?:OnboardingReviewFact[]};
      if(!response.ok) throw new Error('review');
      setReviewFacts(Array.isArray(data.facts)?data.facts:[]);
    }catch{
      setError('تعذر تحميل مراجعة بيانات التأسيس الآن.');
    }
  }

  async function saveReviewFact(){
    if(!reviewEditingKey||reviewSaving)return;
    setReviewSaving(true);
    try{
      const response=await fetch('/api/onboarding/review',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({key:reviewEditingKey,raw:reviewDraft}),
      });
      const data=await response.json() as {message?:string;raw?:string};
      if(!response.ok){
        setError(data.message||'تعذر حفظ التعديل.');
        return;
      }
      setReviewFacts(current=>current.map(fact=>fact.key===reviewEditingKey?{...fact,raw:data.raw??reviewDraft}:fact));
      setReviewEditingKey('');
      setReviewDraft('');
    }catch{
      setError('تعذر حفظ تعديل بيانات التأسيس.');
    }finally{
      setReviewSaving(false);
    }
  }

  async function confirmOnboarding(){
    if(sending)return;
    setSending(true);
    setError('');
    try{
      const response=await fetch('/api/conversations/central',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({body:'تأكيد'}),
      });
      const data=await response.json() as {message?:Message;reply?:Message};
      if(!response.ok||!data.message) throw new Error('confirm');
      setMessages(current=>[...current,data.message as Message,...(data.reply?[data.reply as Message]:[])]);
      setOnboardingComplete(true);
      setOnboardingStep('complete');
      setReviewOpen(false);
    }catch{
      setError('تعذر تأكيد ملف التأسيس الآن.');
    }finally{
      setSending(false);
    }
  }

  async function send(event:FormEvent){ event.preventDefault(); const body=draft.trim(); if(!body||sending)return; setSending(true); setError('');
    try{
      const response=await fetch(`/api/conversations/${activeRoomId}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body})});
      const data=await response.json() as {message?:Message;reply?:Message};
      if(!response.ok||!data.message)throw new Error('write');
      setMessages(current=>[...current,data.message as Message,...(data.reply?[data.reply as Message]:[])]);
      const completed=Boolean(data.reply?.structured_data?.onboarding_complete);
      const nextStep=data.reply?.structured_data?.onboarding_step;
      if(typeof nextStep==='string') setOnboardingStep(nextStep);
      if(completed){ setOnboardingComplete(true); setOnboardingStep('complete'); }
      setDraft('');
      if(composerTextareaRef.current) composerTextareaRef.current.style.height='40px';
    }
    catch{setError('لم تُحفظ الرسالة أو تعذر توليد الرد. لم يعتبر نماء الإرسال مكتملًا؛ أعد المحاولة.')} finally{setSending(false)} }

  const visibleRooms=onboardingComplete===false?rooms.filter(room=>room.id==='central'):rooms;
  const roomButtons=<div className={styles.roomList}>{visibleRooms.map(room=><div key={room.id} className={`${styles.roomItemShell} ${activeRoom.id===room.id?styles.activeRoom:''}`}><button type="button" onClick={()=>chooseRoom(room.id)} className={styles.roomItem}><RoomPortrait room={room} size="md"/><span className={styles.roomCopy}><strong>{chatRoleTitle(room)}</strong></span></button><button type="button" className={styles.roomDetailButton} aria-label={`تفاصيل ${chatRoleTitle(room)}`} onClick={()=>setDetailRoomId(room.id)}><LucideIcon name="info" size={20}/></button></div>)}</div>;

  const contextCards=<><section className={styles.contextCard}><small>الجهة الحالية</small><strong>{activeRoom.title}</strong><p>{activeRoom.lead} · {activeRoom.subtitle}</p></section><section className={styles.contextCard}><small>المشاركون الفعليون</small><strong>{participants.length?`${participants.length} اختصاصيين`:'اختصاصيون حسب الموضوع'}</strong><p>{participants.length?participants.map(p=>p.display_name).join('، '):activeRoom.specialists}. لا تُستدعى جميع الجهات تلقائيًا.</p></section><section className={styles.contextCard}><small>حد التنفيذ</small><strong>توصية ومتابعة فقط</strong><p>لا تحويل، لا سداد، ولا إجراء مالي خارجي يُعد منفذًا من المنصة.</p></section></>;

  return <section className={styles.page} dir="rtl" aria-label="محادثات نماء">
    <Image className={styles.brandWatermark} src="/brand/namaa-leaf.webp" alt="" width={256} height={256} aria-hidden="true" />
    <header className={styles.mobileAppBar}>
      <div className={styles.mobileAppBarPrimary}>
        <button type="button" className={styles.mobileTopButton} aria-label="فتح القائمة الجانبية" onClick={()=>setRoomsOpen(true)}><LucideIcon name="menu" size={20}/></button>
        <Image className={styles.mobileTopLogo} src="/brand/ndos/namaa-logo-color-transparent.png" alt="نماء" width={88} height={44} priority />
      </div>
      <div className={styles.mobileAppBarActions}>
        <ThemeToggle className={styles.mobileThemeToggle}/>
        <button type="button" className={styles.mobileUserButton} aria-label="ملف المستخدم" onClick={()=>setUserMenuOpen(true)}>
          {profile?.image
            ? <span className={styles.userImage} style={{backgroundImage:`url("${profile.image.replace(/"/g,'')}")`}} aria-hidden="true"/>
            : <LucideIcon name="circleUserRound" size={24}/>}
        </button>
      </div>
    </header>
    <header className={styles.workspaceHeader}><div className={styles.headingCopy}><span className={styles.eyebrow}>محادثات نماء</span><h1>مركز الحوار والقرار</h1><p>المحادثات محفوظة في حسابك، وتصل رسالتك إلى الجهة والمتخصصين المرتبطين بالموضوع.</p></div><div className={styles.headerActions}><button type="button" className={styles.secondaryButton} onClick={()=>setDesktopRoomsVisible(v=>!v)}><LucideIcon name="layoutGrid" size={16}/><span>{desktopRoomsVisible?'إخفاء الجهات':'إظهار الجهات'}</span></button><button type="button" className={styles.secondaryButton} onClick={()=>setDesktopContextVisible(v=>!v)}><LucideIcon name="info" size={16}/><span>{desktopContextVisible?'إخفاء السياق':'إظهار السياق'}</span></button></div></header>
    <section className={`${styles.mobileConversationList} ${mobileRoomList?styles.mobileConversationListVisible:''}`} aria-label="محادثات نماء">
      <header className={styles.mobileListHeader}><div><strong>المحادثات</strong><small>{onboardingComplete===false?'ابدأ التأسيس مع المحافظ':'اختر الجهة التي تريد محادثتها'}</small></div></header>
      {roomButtons}
    </section>
    <div className={`${styles.workspace} ${desktopRoomsVisible?'':styles.withoutRooms} ${desktopContextVisible?'':styles.withoutContext}`}>
      {desktopRoomsVisible&&<aside className={styles.roomsPane} aria-label="قائمة المحادثات"><div className={styles.paneTitle}><span>الجهات والمحادثات</span><small>{visibleRooms.length} جهات</small></div>{roomButtons}</aside>}
      <main className={`${styles.chatPane} ${mobileRoomList?styles.mobileChatHidden:''}`}><header className={styles.chatHeader}><div className={styles.chatIdentity}>{onboardingComplete!==false&&<button type="button" className={styles.mobileBack} aria-label="العودة إلى المحادثات" onClick={()=>setMobileRoomList(true)}><LucideIcon name="chevronRight" size={20}/></button>}<RoomPortrait room={activeRoom} size="md"/><div><div className={styles.entityTitle}><strong>{chatRoleTitle(activeRoom)}</strong></div><small>{chatEntityTitle(activeRoom)}</small></div></div><div className={styles.mobileTools}><button type="button" aria-label="معلومات الجهة" onClick={()=>setContextOpen(true)}><LucideIcon name="info" size={20}/></button></div></header>
        <div className={styles.routingNote}><LucideIcon name="sparkles" size={16}/><span>{activeRoom.specialists}</span></div>
        <div className={styles.messages} aria-live="polite">{loading&&<p>جارٍ تحميل سجل المحادثة…</p>}{!loading&&!messages.length&&<article className={`${styles.message} ${styles.agentMessage}`}><p>{onboardingComplete===false?'أنا محافظ بنك نماء المركزي. سأبدأ معك بسؤال واحد في كل مرة حتى أبني ملفك من معلوماتك أنت، دون افتراضات.':'هذه بداية محادثتك مع '+activeRoom.title+'. اكتب سؤالك أو القرار الذي تريد دراسته.'}</p></article>}{messages.map(message=><article key={message.id} className={`${styles.message} ${message.sender_type==='user'?styles.userMessage:styles.agentMessage}`}>{message.sender_type!=='user'&&<div className={styles.messageIdentity}><RoomPortrait room={activeRoom} size="sm"/><span><strong>{activeRoom.id==='central'?'محافظ البنك المركزي':message.sender_name}</strong><small>{message.sender_type==='system'?'رسالة نظام':'شخصية خوارزمية'}</small></span></div>}{message.structured_data?.onboarding===true?<OnboardingMessageContent message={message}/>:<p>{message.body}</p>}{message.message_kind!=='message'&&message.structured_data?.onboarding!==true&&<section className={`${styles.structuredCard} ${styles[`kind_${message.message_kind}`]}`}><header><strong>{labels[message.message_kind]}</strong></header><StructuredFacts data={message.structured_data}/>{(message.message_kind==='decision'||message.message_kind==='request')&&<small className={styles.executionBoundary}>أي تنفيذ مالي خارجي يظل بيد المستخدم، ويحتاج تأكيدًا وإثباتًا قبل الإغلاق.</small>}</section>}</article>)}</div>
        {error&&<div className={styles.routingNote} role="alert"><LucideIcon name="triangleAlert" size={16}/><span>{error}</span></div>}
        {onboardingComplete===false&&onboardingStep==='review'&&<div className={styles.onboardingReviewPrompt}><div><strong>راجع بياناتك قبل التأكيد</strong><small>يمكنك تعديل أي معلومة يدويًا، ثم تثبيت الملف بعد التأكد.</small></div><button type="button" className={styles.secondaryButton} onClick={()=>void openOnboardingReview()}><LucideIcon name="listChecks" size={16}/><span>مراجعة البيانات</span></button></div>}
        <StatementReviewPanel
          enabled={activeRoomId==='central'}
          refreshKey={statementReviewVersion}
          onChanged={async()=>{setStatementReviewVersion(version=>version+1);await refreshActiveRoom();}}
        />
        {statementPickerOpen&&<div className={styles.statementPicker}><div><strong>اختر الحساب المرتبط بالكشف</strong><small>سيُقرأ الملف للمراجعة فقط، ولن ينشئ معاملات تلقائيًا.</small></div><select value={statementAccountId} onChange={event=>setStatementAccountId(event.target.value)} aria-label="الحساب المرتبط بكشف الحساب">{statementAccounts.map(account=><option key={account.id} value={account.id}>{account.bank_name||account.name} — {account.name}</option>)}</select><button type="button" className={styles.secondaryButton} onClick={()=>statementFileRef.current?.click()} disabled={statementUploading}>{statementUploading?'جارٍ الاستيراد…':'اختيار ملف CSV'}</button></div>}
        <div className={styles.attachmentPolicy}><LucideIcon name="upload" size={16}/><span>{onboardingStep==='statements'?'ارفع كشف CSV إن كان متاحًا. كل صف يبقى تحت المراجعة حتى تؤكده.':'المرفق للمراجعة والتحقق فقط؛ لا ينشئ حركة مالية ولا يثبت التنفيذ تلقائيًا.'}</span></div><div className={styles.executionNote}><LucideIcon name="circleCheck" size={16}/><span>نماء يوصي ويتابع؛ التنفيذ المالي الخارجي يتم بواسطة المستخدم.</span></div>
        <form className={styles.composer} onSubmit={send}><input ref={statementFileRef} className={styles.hiddenFileInput} type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(file)void uploadStatement(file)}}/><button type="button" className={styles.attachButton} aria-label="إرفاق كشف حساب CSV" title="إرفاق كشف حساب CSV للمراجعة" onClick={()=>void prepareStatementUpload()} disabled={statementUploading}><LucideIcon name="upload" size={20}/></button><textarea ref={composerTextareaRef} value={draft} onChange={e=>{setDraft(e.target.value);e.currentTarget.style.height='40px';e.currentTarget.style.height=`${Math.min(e.currentTarget.scrollHeight,112)}px`;}} placeholder={`اكتب إلى ${chatRoleTitle(activeRoom)}…`} rows={1} aria-label="نص الرسالة" maxLength={8000}/><button type="submit" className={styles.sendButton} disabled={!draft.trim()||sending} aria-label="إرسال"><span>{sending?'جارٍ التحليل…':'إرسال'}</span><LucideIcon name="send" size={20}/></button></form>
      </main>
      {desktopContextVisible&&<aside className={styles.contextPane} aria-label="سياق المحادثة"><div className={styles.paneTitle}><span>السياق</span><small>حيّز العمل</small></div>{contextCards}</aside>}
    </div>
    {roomsOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="القائمة الجانبية"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setRoomsOpen(false)}/><aside className={styles.mobileSideSheet}><div className={styles.sheetHeader}><strong>نماء</strong><button type="button" onClick={()=>setRoomsOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div><div className={styles.sideSection}><small>الجهات والمحادثات</small>{roomButtons}</div><div className={styles.sideUtilityList}>{onboardingComplete!==false&&<button type="button" onClick={()=>void openAccountsSettings()}><LucideIcon name="walletCards" size={20}/><span>الحسابات</span></button>}<button type="button" onClick={()=>{setRoomsOpen(false);setSettingsSection('general');setSettingsOpen(true)}}><LucideIcon name="settings" size={20}/><span>الإعدادات</span></button><button type="button" onClick={()=>{setRoomsOpen(false);setContextOpen(true)}}><LucideIcon name="info" size={20}/><span>المساعدة والسياق</span></button></div></aside></div>}
    {detailRoomId&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="تفاصيل الجهة"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setDetailRoomId(null)}/><aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>تفاصيل الجهة</strong><button type="button" onClick={()=>setDetailRoomId(null)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>{(()=>{const room=rooms.find(item=>item.id===detailRoomId)??rooms[0];const detail=governedRoomDetails[room.id];return <div className={styles.roomDetailContent}><div className={styles.roomDetailHero}><RoomPortrait room={room} size="lg"/><div><strong>{detail.roleTitle}</strong><small>{detail.entityTitle}</small></div></div><section><small>المسؤولية الأساسية</small><p>{detail.responsibility}</p></section><section><small>ما الذي يراقبه؟</small><p>{detail.observes}</p></section><section><small>متى يتدخل؟</small><p>{detail.intervention}</p></section><section><small>متى لا يتدخل؟</small><p>{detail.avoids}</p></section><section><small>حدود الحوكمة</small><p>{detail.governanceNote}</p></section><section><small>الملفات المشتركة في هذه المحادثة</small>{room.id===activeRoomId&&attachments.length?<div className={styles.detailFiles}>{attachments.map(file=><span key={file.id}><LucideIcon name="receiptText" size={16}/><b>{file.file_name}</b><em>{file.verification_status||'قيد المراجعة'}</em></span>)}</div>:<p>لا توجد ملفات مشتركة مسجلة لهذه المحادثة حاليًا.</p>}</section><div className={styles.detailRefs}><small>المرجع الحاكم</small><span>{detail.sourceRefs.join(' · ')}</span></div></div>})()}</aside></div>}
    {contextOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="سياق المحادثة"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setContextOpen(false)}/><aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>سياق المحادثة</strong><button type="button" onClick={()=>setContextOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>{contextCards}</aside></div>}
    {userMenuOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="قائمة المستخدم"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setUserMenuOpen(false)}/><aside className={styles.userMenuCard}><div className={styles.userMenuIdentity}><button type="button" className={styles.userMenuAvatar} aria-label="صورة المستخدم">{profile?.image?<span className={styles.userImage} style={{backgroundImage:`url("${profile.image.replace(/"/g,'')}")`}}/>:<LucideIcon name="circleUserRound" size={32}/>}</button><div><strong>{profile?.name||'المستخدم'}</strong><small>{profile?.email||''}</small></div></div><button type="button" onClick={()=>{setUserMenuOpen(false);setProfileOpen(true)}}><LucideIcon name="pencil" size={20}/><span>الملف الشخصي وتعديل البيانات</span></button><button type="button" onClick={()=>{setUserMenuOpen(false);setSettingsSection('general');setSettingsOpen(true)}}><LucideIcon name="settings" size={20}/><span>الإعدادات</span></button><button type="button" className={styles.logoutButton} onClick={()=>void logout()}><LucideIcon name="logOut" size={20}/><span>تسجيل الخروج</span></button></aside></div>}
    {profileOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="الملف الشخصي"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setProfileOpen(false)}/><aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>الملف الشخصي</strong><button type="button" onClick={()=>setProfileOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div><div className={styles.profileForm}><label><span>الاسم</span><input value={profileName} onChange={event=>setProfileName(event.target.value)} maxLength={120}/></label><label><span>البريد الإلكتروني</span><input value={profile?.email??''} readOnly/></label><small>تغيير البريد أو كلمة المرور يمر عبر مسار أمان الحساب ولا يُعدّل من شاشة الدردشة مباشرة.</small><button type="button" className={styles.primaryActionButton} onClick={()=>void saveProfile()} disabled={profileSaving||profileName.trim().length<2}>{profileSaving?'جارٍ الحفظ…':'حفظ التعديل'}</button></div></aside></div>}
    {settingsOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="الإعدادات"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setSettingsOpen(false)}/><aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>{settingsSection==='accounts'?'الحسابات':'الإعدادات'}</strong><button type="button" onClick={()=>setSettingsOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>{settingsSection==='accounts'?<div className={styles.accountSettings}>{statementAccounts.length?statementAccounts.map(account=><div key={account.id}><LucideIcon name="creditCard" size={20}/><span><strong>{account.name}</strong><small>{account.bank_name||account.account_type}</small></span></div>):<p>لا توجد حسابات مسجلة بعد. أضفها أثناء التأسيس مع المحافظ.</p>}</div>:<div className={styles.settingsList}><div><span><strong>المظهر</strong><small>التبديل بين الوضع الفاتح والداكن.</small></span><ThemeToggle/></div><div><LucideIcon name="slidersHorizontal" size={20}/><span><strong>القيم الشخصية</strong><small>لا تظهر هنا إلا القيم التي يسمح السجل المركزي بتخصيصها. الأوزان والحدود تحت المعايرة لا يمكن تعديلها من الواجهة.</small></span></div></div>}</aside></div>}
    {reviewOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="مراجعة بيانات التأسيس"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setReviewOpen(false)}/><aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>مراجعة بيانات التأسيس</strong><button type="button" onClick={()=>setReviewOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div><div className={styles.reviewFacts}>{reviewFacts.map(fact=><div key={fact.key} className={styles.reviewFact}><div><small>{fact.label}</small>{reviewEditingKey===fact.key?<textarea value={reviewDraft} onChange={event=>setReviewDraft(event.target.value)} rows={3}/>:<strong>{fact.raw||'—'}</strong>}</div>{reviewEditingKey===fact.key?<div className={styles.reviewFactActions}><button type="button" onClick={()=>{setReviewEditingKey('');setReviewDraft('')}}><LucideIcon name="x" size={16}/><span>إلغاء</span></button><button type="button" onClick={()=>void saveReviewFact()} disabled={reviewSaving}><LucideIcon name="save" size={16}/><span>{reviewSaving?'جارٍ الحفظ…':'حفظ'}</span></button></div>:<button type="button" onClick={()=>{setReviewEditingKey(fact.key);setReviewDraft(fact.raw)}} aria-label={`تعديل ${fact.label}`}><LucideIcon name="pencil" size={16}/></button>}</div>)}</div><div className={styles.reviewConfirm}><small>لن يفتح التشغيل الكامل إلا بعد تأكيدك أن البيانات المجمعة صحيحة.</small><button type="button" className={styles.primaryActionButton} onClick={()=>void confirmOnboarding()} disabled={sending||reviewFacts.length===0}><LucideIcon name="circleCheck" size={20}/><span>{sending?'جارٍ التأكيد…':'تأكيد صحة البيانات'}</span></button></div></aside></div>}
  </section>;
}
