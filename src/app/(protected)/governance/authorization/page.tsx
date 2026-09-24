import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { getAuthorizationAdminSnapshot } from '@/repositories/authorization-admin-repository';
import { listAuthorizationDirectoryUsers } from '@/repositories/authorization-directory-repository';
import { BreakGlassCountdown } from './break-glass-countdown';
import { PageHeader } from '@/components/ui';
import {
  applyProvisioningRequestAction,
  approveProvisioningRequestAction,
  createBreakGlassRequestAction,
  createDelegationRequestAction,
  createGrantRequestAction,
  createRoleAssignmentRequestAction,
  rejectProvisioningRequestAction,
  requestAssignmentStatusAction,
  requestDelegationStatusAction,
  requestGrantStatusAction,
  revokeBreakGlassAction,
} from './actions';

const ROLES=['USER','CENTRAL_BOARD_MEMBER','CENTRAL_BANK_MANAGER','BANK_MANAGER','COMMITTEE_CHAIR','COMMITTEE_MEMBER','ADVISOR','DATA_OWNER','DECISION_OWNER','EXECUTION_OWNER','MONITORING_OWNER','REVIEW_OWNER','CLOSURE_AUTHORITY','AUDITOR','SYSTEM_SERVICE'];
const ACTIONS=['CREATE','READ','UPDATE','SUBMIT','RECOMMEND','REVIEW','APPROVE','REJECT','ESCALATE','ASSIGN','EXECUTE_REQUEST','VERIFY_EVIDENCE','CLOSE','REOPEN','RELEASE','ROLLBACK','EXPORT','ADMINISTER'];
const OBJECTS=['CASE','DECISION','CHANGE_PROPOSAL','BACKTEST','RELEASE','ROLLBACK_REVIEW','EXECUTION_EVIDENCE','AUDIT_EVENT'];
const LEVELS=['LOW','MEDIUM','HIGH','CRITICAL'];

const ROLE_LABELS:Record<string,string>={
  USER:'مستخدم', CENTRAL_BOARD_MEMBER:'عضو المجلس المركزي', CENTRAL_BANK_MANAGER:'مدير البنك المركزي',
  BANK_MANAGER:'مدير بنك', COMMITTEE_CHAIR:'رئيس لجنة', COMMITTEE_MEMBER:'عضو لجنة', ADVISOR:'مستشار',
  DATA_OWNER:'مالك البيانات', DECISION_OWNER:'مالك القرار', EXECUTION_OWNER:'مسؤول التنفيذ',
  MONITORING_OWNER:'مسؤول المتابعة', REVIEW_OWNER:'مسؤول المراجعة', CLOSURE_AUTHORITY:'جهة الإغلاق',
  AUDITOR:'مدقق', SYSTEM_SERVICE:'خدمة نظامية',
};
const ACTION_LABELS:Record<string,string>={
  CREATE:'إنشاء',READ:'قراءة',UPDATE:'تحديث',SUBMIT:'إرسال',RECOMMEND:'توصية',REVIEW:'مراجعة',
  APPROVE:'اعتماد',REJECT:'رفض',ESCALATE:'تصعيد',ASSIGN:'إسناد',EXECUTE_REQUEST:'طلب تنفيذ',
  VERIFY_EVIDENCE:'التحقق من الأدلة',CLOSE:'إغلاق',REOPEN:'إعادة فتح',RELEASE:'إصدار',
  ROLLBACK:'تراجع',EXPORT:'تصدير',ADMINISTER:'إدارة',
};
const OBJECT_LABELS:Record<string,string>={
  CASE:'قضية',DECISION:'قرار',CHANGE_PROPOSAL:'مقترح تغيير',BACKTEST:'اختبار خلفي',RELEASE:'إصدار',
  ROLLBACK_REVIEW:'مراجعة التراجع',EXECUTION_EVIDENCE:'دليل تنفيذ',AUDIT_EVENT:'حدث تدقيق',
};
const LEVEL_LABELS:Record<string,string>={LOW:'منخفض',MEDIUM:'متوسط',HIGH:'مرتفع',CRITICAL:'حرج'};
const STATUS_LABELS:Record<string,string>={
  ACTIVE:'فعال',INACTIVE:'غير فعال',SUSPENDED:'موقوف',REVOKED:'ملغى',EXPIRED:'منتهي',
  PENDING:'معلق',APPROVED:'معتمد',REJECTED:'مرفوض',
};
const label=(map:Record<string,string>,value:string)=>map[value]??value;

const MESSAGE:Record<string,string>={
  ROLE_ASSIGNMENT_REQUEST_CREATED:'تم إنشاء طلب إسناد الدور. لن يصبح فعالًا قبل اعتماد مستقل ثم التطبيق.',
  GRANT_REQUEST_CREATED:'تم إنشاء طلب الصلاحية. لا توجد صلاحية جديدة حتى الاعتماد والتطبيق.',
  DELEGATION_REQUEST_CREATED:'تم إنشاء طلب التفويض ضمن النطاق والزمن المحددين.',
  BREAK_GLASS_REQUEST_CREATED:'تم إنشاء طلب الوصول الطارئ. الطلب وحده لا يمنح أي وصول.',
  ROLE_ASSIGNMENT_STATUS_REQUEST_CREATED:'تم إنشاء طلب تغيير حالة الدور.',
  GRANT_STATUS_REQUEST_CREATED:'تم إنشاء طلب تغيير حالة صلاحية.',
  DELEGATION_STATUS_REQUEST_CREATED:'تم إنشاء طلب تغيير حالة التفويض.',
  PROVISIONING_REQUEST_APPROVED:'تم تسجيل الاعتماد المستقل. ما زال التطبيق إجراءً مستقلًا.',
  PROVISIONING_REQUEST_REJECTED:'تم رفض الطلب وتسجيل السبب.',
  PROVISIONING_REQUEST_APPLIED:'تم تطبيق الطلب ذريًا وتسجيل الأثر في سجل التدقيق.',
  BREAK_GLASS_REVOKED:'تم إلغاء الوصول الطارئ فورًا وتسجيل الحدث.',
};

function text(row:Record<string,unknown>,key:string):string { const v=row[key]; return v==null||v===''?'—':String(v); }
function countBy(rows:Array<Record<string,unknown>>,key:string,value:string):number { return rows.filter((r)=>String(r[key]??'')===value).length; }
function message(code?:string):string|null { if(!code)return null; if(code.startsWith('AUTHORIZATION_DENIED'))return 'لا تسمح صلاحياتك الحالية بهذا الإجراء.'; return MESSAGE[code]??code; }
function q(v:string|string[]|undefined):string|undefined { return Array.isArray(v)?v[0]:v; }

export default async function AuthorizationAdminPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
  const user=await requireAuthenticatedUser();
  const query=searchParams?await searchParams:{};
  const access=await authorizationRepository.authorize({actorUserId:user.id,action:'ADMINISTER',resource:{objectType:'AUDIT_EVENT',objectId:'authorization-admin-console'}});
  if(access.decision!=='ALLOW') notFound();

  const [snapshot,directory]=await Promise.all([getAuthorizationAdminSnapshot(),listAuthorizationDirectoryUsers()]);
  const pending=snapshot.requests.filter((r)=>String(r.status)==='PENDING');
  const approved=snapshot.requests.filter((r)=>String(r.status)==='APPROVED');
  const activeBreakGlass=snapshot.breakGlass.filter((r)=>r.is_current===true);
  const feedback=message(q(query.message));

  return <main className="app-page p47-decision-page namaa-authorization-admin" dir="rtl">
    <div className="page-shell p47-analysis-shell namaa-migrated-shell namaa-page-stack">
      <PageHeader
        className="p47-analysis-header namaa-migrated-header"
        eyebrow="حوكمة الصلاحيات"
        title="إدارة الصلاحيات والتفويضات"
        description="كل تغيير يمر عبر طلب، اعتماد مستقل، ثم تطبيق ذري. الرفض هو الوضع الافتراضي ما لم توجد صلاحية صريحة."
      />

      {feedback?<p role="status" className={q(query.status)==='error'?'form-error':'muted'}>{feedback}</p>:null}

      <div className="p74-inline-metrics namaa-authorization-metrics">
        <span>طلبات معلقة <b>{pending.length}</b></span>
        <span>معتمدة تنتظر التطبيق <b>{approved.length}</b></span>
        <span>أدوار فعالة <b>{countBy(snapshot.assignments,'status','ACTIVE')}</b></span>
        <span>الصلاحيات فعالة <b>{snapshot.grants.filter((r)=>r.is_active===true).length}</b></span>
        <span>تفويضات فعالة <b>{countBy(snapshot.delegations,'status','ACTIVE')}</b></span>
        <span>وصول طارئ نشط <b>{activeBreakGlass.length}</b></span>
      </div>

      <section className="p47-analysis-card namaa-authorization-card">
        <div className="p47-section-heading"><div><span>صندوق طلبات الصلاحيات</span><h2>صندوق طلبات الصلاحيات</h2></div><small>الطالب لا يستطيع اعتماد طلبه بنفسه</small></div>
        {pending.length===0&&approved.length===0?<div className="p47-empty-state"><strong>لا توجد طلبات مفتوحة</strong><span>الطلبات النهائية تبقى محفوظة في السجل أدناه.</span></div>:null}
        {[...pending,...approved].map((r)=><details className="decision-details namaa-authorization-details" key={text(r,'id')} open={String(r.status)==='PENDING'}>
          <summary>{text(r,'change_type')} — {label(STATUS_LABELS,text(r,'status'))}</summary>
          <div className="p74-inline-metrics namaa-authorization-metrics">
            <span>الطالب <b>{text(r,'requested_by_name')}</b></span>
            <span>المستفيد <b>{text(r,'subject_name')}</b></span>
            
            <span>تاريخ الطلب <b>{text(r,'requested_at')}</b></span>
          </div>
          <p>{text(r,'rationale')}</p>
          {String(r.status)==='PENDING'?<div className="ndos-actions namaa-authorization-actions">
            <form action={approveProvisioningRequestAction}><input type="hidden" name="requestId" value={text(r,'id')}/><button className="primary-button" type="submit">اعتماد مستقل</button></form>
            <form action={rejectProvisioningRequestAction} className="ndos-form-grid namaa-authorization-form"><input type="hidden" name="requestId" value={text(r,'id')}/><textarea name="rationale" minLength={20} required placeholder="سبب الرفض القابل للتدقيق"/><button className="secondary-button" type="submit">رفض الطلب</button></form>
          </div>:null}
          {String(r.status)==='APPROVED'?<form action={applyProvisioningRequestAction} className="ndos-actions namaa-authorization-actions"><input type="hidden" name="requestId" value={text(r,'id')}/><button className="primary-button" type="submit">تطبيق الطلب ذريًا</button></form>:null}
        </details>)}
      </section>

      <section className="p47-analysis-card namaa-authorization-card">
        <div className="p47-section-heading"><div><span>إنشاء الطلبات</span><h2>إنشاء طلبات حوكمية جديدة</h2></div><small>هذه النماذج لا تمنح صلاحية مباشرة</small></div>

        <details className="decision-details namaa-authorization-details"><summary>طلب إسناد دور</summary>
          <form action={createRoleAssignmentRequestAction} className="ndos-form-grid namaa-authorization-form">
            <label><span>المستخدم</span><select name="userId" required>{directory.map((u)=><option key={u.id} value={u.id}>{u.displayName}</option>)}</select></label>
            <label><span>الدور</span><select name="role" required>{ROLES.map((v)=><option key={v} value={v}>{label(ROLE_LABELS,v)}</option>)}</select></label>
            <label><span>نطاق البنك</span><input name="bankKey" placeholder="اختياري"/></label>
            <label><span>اللجنة</span><input name="committeeId" placeholder="اختياري"/></label>
            <label><span>بداية الصلاحية</span><input type="datetime-local" name="startsAt"/></label>
            <label><span>نهاية الصلاحية</span><input type="datetime-local" name="endsAt"/></label>
            <label><span>المسوغ</span><textarea name="rationale" required minLength={20}/></label>
            <div className="ndos-actions namaa-authorization-actions"><button className="primary-button" type="submit">إنشاء طلب الدور</button></div>
          </form>
        </details>

        <details className="decision-details namaa-authorization-details"><summary>طلب صلاحية</summary>
          <form action={createGrantRequestAction} className="ndos-form-grid namaa-authorization-form">
            <label><span>الدور</span><select name="role" required>{ROLES.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>الإجراء</span><select name="action" required>{ACTIONS.map((v)=><option key={v} value={v}>{label(ACTION_LABELS,v)}</option>)}</select></label>
            <label><span>نوع الكائن</span><select name="objectType" required>{OBJECTS.map((v)=><option key={v} value={v}>{label(OBJECT_LABELS,v)}</option>)}</select></label>
            <label><span>البنك</span><input name="bankKey"/></label><label><span>اللجنة</span><input name="committeeId"/></label><label><span>نوع القضية</span><input name="caseType"/></label>
            <label><span>أقصى مخاطرة</span><select name="maxRisk"><option value="">بدون حد إضافي</option>{LEVELS.map((v)=><option key={v} value={v}>{label(LEVEL_LABELS,v)}</option>)}</select></label>
            <label><span>أقصى مادية</span><select name="maxMateriality"><option value="">بدون حد إضافي</option>{LEVELS.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>أقصى مبلغ</span><input type="number" min="0" step="0.01" name="maxAmount"/></label>
            <label><span>نسخة السياسة</span><input name="policyVersion" defaultValue="RBAC_ABAC_v1.0"/></label>
            <label><span>المسوغ</span><textarea name="rationale" required minLength={20}/></label>
            <div className="ndos-actions namaa-authorization-actions"><button className="primary-button" type="submit">إنشاء طلب صلاحية</button></div>
          </form>
        </details>

        <details className="decision-details namaa-authorization-details"><summary>طلب تفويض محدود</summary>
          <form action={createDelegationRequestAction} className="ndos-form-grid namaa-authorization-form">
            <label><span>المفوِّض</span><select name="fromUserId" required>{directory.map((u)=><option key={u.id} value={u.id}>{u.displayName}</option>)}</select></label>
            <label><span>المفوَّض له</span><select name="toUserId" required>{directory.map((u)=><option key={u.id} value={u.id}>{u.displayName}</option>)}</select></label>
            <label><span>الدور المشترك</span><select name="role" required>{ROLES.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>الإجراء</span><select name="action" required>{ACTIONS.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>نوع الكائن</span><select name="objectType" required>{OBJECTS.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>البنك</span><input name="bankKey"/></label><label><span>اللجنة</span><input name="committeeId"/></label><label><span>نوع القضية</span><input name="caseType"/></label>
            <label><span>أقصى مخاطرة</span><select name="maxRisk"><option value="">—</option>{LEVELS.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>أقصى مادية</span><select name="maxMateriality"><option value="">—</option>{LEVELS.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>أقصى مبلغ</span><input type="number" min="0" step="0.01" name="maxAmount"/></label>
            <label><span>من</span><input type="datetime-local" name="startsAt" required/></label><label><span>إلى</span><input type="datetime-local" name="endsAt" required/></label>
            <label><span>المسوغ</span><textarea name="rationale" required minLength={20}/></label>
            <div className="ndos-actions namaa-authorization-actions"><button className="primary-button" type="submit">إنشاء طلب التفويض</button></div>
          </form>
        </details>

        <details className="decision-details namaa-authorization-details"><summary>طلب وصول طارئ</summary>
          <form action={createBreakGlassRequestAction} className="ndos-form-grid namaa-authorization-form">
            <label><span>المستخدم</span><select name="userId" required>{directory.map((u)=><option key={u.id} value={u.id}>{u.displayName}</option>)}</select></label>
            <label><span>الدور الفعلي</span><select name="role" required>{ROLES.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>الإجراء المؤقت</span><select name="action" required>{ACTIONS.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>نوع الكائن</span><select name="objectType" required>{OBJECTS.map((v)=><option key={v}>{v}</option>)}</select></label>
            <label><span>المدة بالدقائق</span><input type="number" name="durationMinutes" min="1" max="60" defaultValue="30" required/></label>
            <label><span>مرجع الحادث</span><input name="incidentReference" required minLength={3}/></label>
            <label><span>التبرير الطارئ</span><textarea name="justification" required minLength={30}/></label>
            <label><span>المسوغ الإداري</span><textarea name="rationale" required minLength={20}/></label>
            <div className="ndos-actions namaa-authorization-actions"><button className="secondary-button" type="submit">إنشاء طلب وصول طارئ</button></div>
          </form>
        </details>
      </section>

      <section className="p47-analysis-card namaa-authorization-card">
        <div className="p47-section-heading"><div><span>الوصول الطارئ</span><h2>وصول طارئ النشط</h2></div><small>حد أقصى 60 دقيقة</small></div>
        {activeBreakGlass.length===0?<div className="p47-empty-state"><strong>لا يوجد وصول طارئ نشط</strong></div>:activeBreakGlass.map((r)=><details className="decision-details namaa-authorization-details" key={text(r,'id')} open>
          <summary>{text(r,'actor_name')} — {text(r,'incident_reference')}</summary>
          <div className="p74-inline-metrics namaa-authorization-metrics"><span>ينتهي خلال <b><BreakGlassCountdown expiresAt={text(r,'expires_at')}/></b></span><span>ينتهي في <b>{text(r,'expires_at')}</b></span><span>المعتمد <b>{text(r,'approved_by_name')}</b></span></div>
          <p>{text(r,'justification')}</p>
          <form action={revokeBreakGlassAction} className="ndos-form-grid namaa-authorization-form"><input type="hidden" name="sessionId" value={text(r,'id')}/><textarea name="rationale" required minLength={20} placeholder="سبب الإلغاء الفوري"/><div className="ndos-actions namaa-authorization-actions"><button className="secondary-button" type="submit">إلغاء الوصول الطارئ</button></div></form>
        </details>)}
      </section>

      <section className="p47-analysis-card namaa-authorization-card">
        <div className="p47-section-heading"><div><span>الوصول الفعال</span><h2>الأدوار والصلاحيات والتفويضات</h2></div></div>
        <details className="decision-details namaa-authorization-details"><summary>إسنادات الأدوار ({snapshot.assignments.length})</summary>{snapshot.assignments.map((r)=><div key={text(r,'id')} className="p47-empty-state"><strong>{text(r,'display_name')} — {label(ROLE_LABELS,text(r,'role'))}</strong><span>{label(STATUS_LABELS,text(r,'status'))} | البنك: {text(r,'bank_key')} | اللجنة: {text(r,'committee_id')}</span>{['ACTIVE','SUSPENDED'].includes(text(r,'status'))?<form action={requestAssignmentStatusAction} className="ndos-form-grid namaa-authorization-form"><input type="hidden" name="assignmentId" value={text(r,'id')}/><select name="status" defaultValue={text(r,'status')==='ACTIVE'?'SUSPENDED':'ACTIVE'}><option value="ACTIVE">فعال</option><option value="SUSPENDED">موقوف</option><option value="REVOKED">ملغى</option><option value="EXPIRED">منتهي</option></select><input name="rationale" required minLength={20} placeholder="مسوغ تغيير الحالة"/><button className="secondary-button" type="submit">طلب تغيير الحالة</button></form>:null}</div>)}</details>
        <details className="decision-details namaa-authorization-details"><summary>الصلاحيات ({snapshot.grants.length})</summary>{snapshot.grants.map((r)=><div key={text(r,'id')} className="p47-empty-state"><strong>{label(ROLE_LABELS,text(r,'role'))} — {label(ACTION_LABELS,text(r,'action'))} / {label(OBJECT_LABELS,text(r,'object_type'))}</strong><span>{r.is_active===true?'فعال':'غير فعال'} | البنك: {text(r,'bank_key')} | أقصى مخاطرة: {label(LEVEL_LABELS,text(r,'max_risk'))} | أقصى مبلغ: {text(r,'max_amount')}</span><form action={requestGrantStatusAction} className="ndos-form-grid namaa-authorization-form"><input type="hidden" name="grantId" value={text(r,'id')}/><input type="hidden" name="isActive" value={r.is_active===true?'false':'true'}/><input name="rationale" required minLength={20} placeholder="مسوغ تغيير حالة صلاحية"/><button className="secondary-button" type="submit">طلب {r.is_active===true?'تعطيل':'تفعيل'}</button></form></div>)}</details>
        <details className="decision-details namaa-authorization-details"><summary>التفويضات ({snapshot.delegations.length})</summary>{snapshot.delegations.map((r)=><div key={text(r,'id')} className="p47-empty-state"><strong>{text(r,'from_name')} → {text(r,'to_name')} — {label(ROLE_LABELS,text(r,'to_role'))}</strong><span>{label(STATUS_LABELS,text(r,'status'))} | {text(r,'starts_at')} → {text(r,'ends_at')}</span>{['ACTIVE','SUSPENDED'].includes(text(r,'status'))?<form action={requestDelegationStatusAction} className="ndos-form-grid namaa-authorization-form"><input type="hidden" name="delegationId" value={text(r,'id')}/><select name="status" defaultValue={text(r,'status')==='ACTIVE'?'SUSPENDED':'ACTIVE'}><option value="ACTIVE">فعال</option><option value="SUSPENDED">موقوف</option><option value="REVOKED">ملغى</option><option value="EXPIRED">منتهي</option></select><input name="rationale" required minLength={20} placeholder="مسوغ تغيير حالة التفويض"/><button className="secondary-button" type="submit">طلب تغيير الحالة</button></form>:null}</div>)}</details>
      </section>

      <section className="p47-analysis-card namaa-authorization-card">
        <div className="p47-section-heading"><div><span>سجل التدقيق غير القابل للتعديل</span><h2>سجل إدارة الصلاحيات</h2></div><small>إضافة فقط</small></div>
        {snapshot.events.map((r)=><details className="decision-details namaa-authorization-details" key={text(r,'id')}><summary>{text(r,'event_type')} — {text(r,'created_at')}</summary><div className="p74-inline-metrics namaa-authorization-metrics"><span>الفاعل <b>{text(r,'actor_name')}</b></span><span>الهدف <b>{text(r,'target_name')}</b></span><span>الكائن <b>{label(OBJECT_LABELS,text(r,'object_type'))}</b></span></div><p>{text(r,'reason')}</p></details>)}
      </section>
    </div>
  </main>;
}
