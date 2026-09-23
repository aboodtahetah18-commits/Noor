import { randomUUID } from 'node:crypto';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { formatSar } from '@/lib/format-money';
import { cancelObligationAction, createObligationAction, payObligationAction } from './actions';

type AccountOption={id:string;name:string;isActive:boolean};
type ObligationRow={
  id:string;
  name:string;
  status:string;
  recurrence:string;
  isReserved:boolean;
  amount:string;
  dueDate:string;
  expectedAccountName:string|null;
  expectedAccountId:string|null;
};

const STATUS_LABELS:Record<string,string>={OVERDUE:'متأخرة',DUE:'مستحقة الآن',UPCOMING:'قادمة',PAID:'مدفوعة',CANCELLED:'ملغاة'};
const RECURRENCE_LABELS:Record<string,string>={ONCE:'مرة واحدة',MONTHLY:'شهري',QUARTERLY:'ربع سنوي',SEMI_ANNUAL:'نصف سنوي',ANNUAL:'سنوي'};

function AddObligationForm({accounts,today}:{accounts:AccountOption[];today:string}){
  const active=accounts.filter(a=>a.isActive);
  return <form action={createObligationAction} className="form-grid">
    <input type="hidden" name="idempotencyKey" value={randomUUID()}/>
    <label>اسم الالتزام<input name="name" required maxLength={160} placeholder="مثال: فاتورة الإنترنت"/></label>
    <label>المبلغ الافتراضي<input name="defaultAmount" required inputMode="decimal" placeholder="0.00"/></label>
    <label>التكرار<select name="recurrence" defaultValue="MONTHLY"><option value="ONCE">مرة واحدة</option><option value="MONTHLY">شهري</option><option value="QUARTERLY">ربع سنوي</option><option value="SEMI_ANNUAL">نصف سنوي</option><option value="ANNUAL">سنوي</option></select></label>
    <label>أول تاريخ استحقاق<input name="firstDueDate" type="date" defaultValue={today} required/></label>
    <label>الأولوية<input name="priority" type="number" min="1" placeholder="اختياري"/></label>
    <label>الحساب المتوقع<select name="expectedAccountId"><option value="">غير محدد</option>{active.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <button className="primary-button" type="submit">إنشاء الالتزام</button>
  </form>;
}

export function ObligationsWide({items,accounts,today}:{items:ObligationRow[];accounts:AccountOption[];today:string}){
  const active=accounts.filter(a=>a.isActive);
  return <section className="p47-resource-card namaa-wide-only namaa-collection-card" dir="rtl">
    <div className="namaa-collection-head">
      <div><span>البيانات المتكررة</span><h2>جدول الاستحقاقات</h2><small>أضف أكثر من التزام من نافذة كبيرة؛ كل إضافة تحفظ كسطر مستقل في الجدول.</small></div>
      <ActionDialog title="إضافة التزام مالي" description="أدخل البيانات ثم أكّد الحفظ ليظهر الالتزام مباشرة في الجدول." size="xl" triggerClassName="primary-link" trigger="إضافة التزام"><AddObligationForm accounts={accounts} today={today}/></ActionDialog>
    </div>
    {items.length===0?<div className="p47-empty-state"><strong>لا توجد التزامات بعد</strong><span>أضف أول التزام ليظهر هنا.</span></div>:<div className="namaa-table-wrap"><table className="namaa-data-table">
      <thead><tr><th>الالتزام</th><th>الحالة</th><th>المبلغ</th><th>الاستحقاق</th><th>التكرار</th><th>الحساب</th><th>الإجراءات</th></tr></thead>
      <tbody>{items.map(o=><tr key={o.id}>
        <td><strong>{o.name}</strong>{o.isReserved?<small className="namaa-table-note">محجوز ماليًا</small>:null}</td>
        <td><span className={'namaa-table-status is-'+o.status.toLowerCase()}>{STATUS_LABELS[o.status]??o.status}</span></td>
        <td><strong>{formatSar(o.amount)}</strong></td>
        <td>{o.dueDate}</td>
        <td>{RECURRENCE_LABELS[o.recurrence]??o.recurrence}</td>
        <td>{o.expectedAccountName??'—'}</td>
        <td><div className="p49-resource-actions">
          <ActionDialog title={'تفاصيل '+o.name} size="lg" trigger="التفاصيل"><div className="detail-list"><div><span>الحالة</span><strong>{STATUS_LABELS[o.status]??o.status}</strong></div><div><span>المبلغ</span><strong>{formatSar(o.amount)}</strong></div><div><span>الاستحقاق</span><strong>{o.dueDate}</strong></div><div><span>التكرار</span><strong>{RECURRENCE_LABELS[o.recurrence]??o.recurrence}</strong></div><div><span>الحساب المتوقع</span><strong>{o.expectedAccountName??'—'}</strong></div></div></ActionDialog>
          {['UPCOMING','DUE','OVERDUE'].includes(o.status)?<ActionDialog title={'تسجيل سداد '+o.name} description={'المبلغ المستحق '+formatSar(o.amount)} size="xl" trigger="تسجيل السداد"><form className="form-grid" action={payObligationAction}><input type="hidden" name="obligationOccurrenceId" value={o.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><label>المبلغ<input name="amount" value={o.amount} readOnly/></label><label>تاريخ السداد<input name="transactionDate" type="date" defaultValue={today} required/></label><label>الحساب<select name="accountId" defaultValue={o.expectedAccountId??''} required><option value="">اختر الحساب</option>{active.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><button className="primary-button" type="submit">تأكيد السداد</button></form></ActionDialog>:null}
          {o.status==='UPCOMING'?<ActionDialog title={'إلغاء '+o.name} description="لن يحذف السجل التاريخي." size="sm" trigger="إلغاء"><form action={cancelObligationAction}><input type="hidden" name="obligationOccurrenceId" value={o.id}/><input type="hidden" name="reason" value="إلغاء بواسطة المستخدم"/><button className="danger-button" type="submit">تأكيد الإلغاء</button></form></ActionDialog>:null}
        </div></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
