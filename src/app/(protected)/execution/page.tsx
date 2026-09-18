import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listOpenExecutionTasks } from '@/features/financial-engine/services/execution-service';
import { reportExecutionAction } from './actions';

const statusLabels:Record<string,string>={
  USER_ACTION_REQUEST:'بانتظار تنفيذك الخارجي',WAITING_USER_CONFIRMATION:'بانتظار تأكيدك',EVIDENCE_PENDING:'الإثبات قيد المراجعة',
  VERIFICATION_PENDING:'قيد التحقق',VERIFIED_EXECUTION:'تم التحقق من التنفيذ',RECONCILIATION:'قيد المطابقة',PARTIAL:'تنفيذ جزئي',
  FAILED:'تعذر التنفيذ',OVERDUE:'متأخر',DISPUTED:'محل مراجعة',CANNOT_REVERSE:'غير قابل للتراجع',
};

export default async function ExecutionPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const user=await requireAuthenticatedUser();
  const [tasks,q]=await Promise.all([listOpenExecutionTasks(user.id),searchParams]);
  return <main className="page-shell p47-closure-page" dir="rtl">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">التنفيذ والمتابعة</p><div className="title-with-help"><h1>مركز التنفيذ الخارجي والإثبات</h1></div><p>نماء لا يحرك أموالك. نفّذ العملية في البنك أو الجهة الخارجية، ثم أكدها واربط الإثبات هنا.</p></div><Link className="button-link secondary" href="/advisor">العودة للمستشار</Link></header>
    {q.reported==='1'?<section className="card"><strong>تم استلام تأكيد التنفيذ.</strong><p className="muted">لن يعتبر النظام العملية منفذة نهائيًا حتى يكتمل التحقق من الإثبات والمطابقة.</p></section>:null}
    {q.error?<section className="card"><strong>تعذر تسجيل التأكيد: {q.error}</strong><p className="muted">لم يتم وسم العملية كتنفيذ متحقق.</p></section>:null}
    <section className="card"><div className="row-between"><div><p className="eyebrow">المهام المفتوحة</p><h2>{tasks.length?`${tasks.length} مهمة تحتاج متابعة`:'لا توجد مهام تنفيذ مفتوحة'}</h2></div></div>
      {tasks.length===0?<p className="muted">عندما تعتمد قرارًا ماليًا من المستشار ستظهر مهمة التنفيذ هنا.</p>:<div>{tasks.map(task=><article className="card" key={task.id}>
        <div className="row-between"><div><strong>{task.actionType}</strong><p className="muted">{statusLabels[task.status]??task.status}</p></div>{task.amount?<strong>{task.amount} {task.currency}</strong>:null}</div>
        {task.decisionReference?<p className="muted">مرجع القرار: <strong>{task.decisionReference}</strong></p>:null}
        {task.instructions?<p>{task.instructions}</p>:null}
        {['USER_ACTION_REQUEST','WAITING_USER_CONFIRMATION','OVERDUE'].includes(task.status)?<form action={reportExecutionAction}>
          <input type="hidden" name="executionTaskId" value={task.id}/>
          {task.amount?<input type="hidden" name="reportedAmount" value={task.amount}/>:null}
          <label>نوع الإثبات<select name="evidenceType" defaultValue="REFERENCE"><option value="REFERENCE">مرجع عملية</option><option value="BANK_RECEIPT">إيصال بنكي</option><option value="TRANSFER_RECEIPT">إيصال تحويل</option><option value="BILL_RECEIPT">إيصال سداد</option><option value="STATEMENT">كشف حساب</option><option value="OTHER">إثبات آخر</option></select></label>
          <label>مرجع أو رابط الإثبات<input name="externalReference" required maxLength={500} placeholder="رقم المرجع أو رابط آمن للإثبات"/></label>
          <label>تاريخ العملية<input name="claimedDate" type="date" required/></label>
          <label>الحساب المصدر<input name="sourceAccountRef" required maxLength={500} placeholder="اسم الحساب أو المعرّف أو الآيبان"/></label>
          <label>الطرف المقابل أو الوصف المطابق<input name="counterpartyRef" maxLength={500} placeholder="اختياري عند وجود رقم مرجع واضح"/></label>
          <div className="inline-actions"><button type="submit">تأكيد أنني نفذت خارجيًا</button></div>
          <p className="muted">هذا التأكيد ينقل المهمة للتحقق فقط، ولا يمنحها حالة VERIFIED_EXECUTION تلقائيًا.</p>
        </form>:<p className="muted">لا يلزم إجراء إضافي منك الآن؛ النظام ينتظر التحقق أو المطابقة.</p>}
      </article>)}</div>}
    </section>
  </main>;
}
