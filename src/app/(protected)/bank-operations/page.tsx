import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import { formatSar } from '@/lib/format-money';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
const KIND:Record<string,string>={EXPENSE:'مصروف',INCOME:'دخل',TRANSFER:'تحويل',REFUND:'استرداد',FEE:'رسوم',UNKNOWN:'غير معروف'};
export default async function BankOperationsPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const user=await requireAuthenticatedUser();const [center,q]=await Promise.all([getDailyBankOperationsCenter(user.id),searchParams]);
  return <main className="p47-page" dir="rtl"><section className="p47-content-shell">
    <header className="p47-page-heading"><div><p className="p47-kicker">التشغيل اليومي</p><div className="title-with-help"><h1>مركز العمليات البنكية</h1></div><div className="p47-cycle-line"><span className={`p47-status-dot ${center.pendingReviewCount?'is-warn':'is-good'}`}/><span>{center.pendingReviewCount?`${center.pendingReviewCount} تحتاج قرارك`:'لا توجد عمليات معلقة'}</span></div></div></header>
    {q.error?<section className="p47-panel p47-danger-panel"><strong>{q.error}</strong></section>:null}
    <section className="p47-bank-journey"><div className="is-current"><b>1</b><span>ألصق الرسالة</span></div><div><b>2</b><span>تحقق من التكرار</span></div><div><b>3</b><span>التاجر والبند</span></div><div><b>4</b><span>المراجعة</span></div><div><b>5</b><span>السجل والخطة</span></div></section>
    <section className={`p74-focus-summary ${center.pendingReviewCount?'is-warning':''}`}><div><span>المهمة الوحيدة هنا</span><strong>{center.pendingReviewCount?`${center.pendingReviewCount} عملية تحتاج قرارك`:'لا توجد مراجعات معلقة'}</strong><small>راجع الرسائل البنكية غير المحسومة فقط. بقية التاريخ في السجل المالي.</small></div></section>
    <section className="p47-panel"><div className="p47-section-heading"><div><p className="p47-kicker">صندوق القرار</p><h2>تحتاج قرارك الآن</h2></div><span className="p47-count-badge">{center.pendingReviewCount}</span></div>{center.pendingItems.length===0?<div className="p47-soft-empty"><strong>لا توجد عمليات معلقة</strong><span>أي رسالة تحتاج مراجعتك ستظهر هنا.</span></div>:<div className="p47-review-list">{center.pendingItems.map(item=><article key={item.rowId}><div className="p47-review-head"><div><strong>{item.description}</strong><span>{item.bankName?`${item.bankName} · `:''}{item.accountName} · {item.transactionDate??'بدون تاريخ'}</span></div><b>{item.direction==='DEBIT'?'−':'+'}{formatSar(item.amount)}</b></div><div className="p47-review-tags"><span>{KIND[item.detectedKind]??item.detectedKind}</span><span>ثقة {Number(item.confidence).toFixed(0)}%</span>{item.categoryName?<span>{item.categoryName}</span>:<em>بدون بند</em>}{item.duplicateCandidate?<em>مكرر محتمل</em>:null}{item.fundingTitle?<span>{item.fundingTitle}</span>:null}</div><Link className="p47-primary-action" href={`/bank-statements/${item.importId}`}>مراجعة واعتماد</Link></article>)}</div>}</section>
    <FocusedNextStep href="/bank-statements" title="مطابقة كشف الحساب" description="بعد حسم الرسائل اليومية، انتقل إلى كشف الحساب للتحقق من الاكتمال والمطابقة."/>
  </section></main>
}
