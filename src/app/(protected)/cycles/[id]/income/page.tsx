import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getFinancialCycle } from '@/features/cycles/queries/get-cycle';
import { listExpectedIncomes } from '@/features/expected-income/queries/list-expected-incomes';
import { createExpectedIncomeAction } from './actions';
import { formatSar } from '@/lib/format-money';

const kindLabel:Record<string,string>={SALARY:'راتب',ADDITIONAL_INCOME:'دخل إضافي',BONUS:'مكافأة',OTHER:'أخرى'};
export default async function ExpectedIncomePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const u=await requireAuthenticatedUser(); const cycle=await getFinancialCycle(u.id,id); if(!cycle)notFound(); const items=await listExpectedIncomes(u.id,id); const locked=cycle.status==='CLOSING'||cycle.status==='CLOSED';
 return <main className="foundation-page p47-closure-page" dir="rtl"><section className="foundation-card"><p className="eyebrow">الدخل المتوقع</p><div className="title-with-help"><h1>{cycle.name}</h1></div>{cycle.status==='ACTIVE'&&<p><a href={`/income/new?cycleId=${cycle.id}`}>تسجيل الدخل المستلم فعليًا</a></p>}{!locked&&<form action={createExpectedIncomeAction.bind(null,id)}><label>مصدر الدخل<input name="sourceName" required placeholder="الراتب"/></label><label>القيمة المتوقعة<input name="expectedAmount" inputMode="decimal" required placeholder="10000.00"/></label><label>تاريخ الاستلام المتوقع<input name="expectedDate" type="date" required/></label><label>نوع الدخل<select name="incomeKind" defaultValue="SALARY"><option value="SALARY">راتب</option><option value="ADDITIONAL_INCOME">دخل إضافي</option><option value="BONUS">مكافأة</option><option value="OTHER">أخرى</option></select></label><label><input name="isPrimary" type="checkbox"/> الدخل الأساسي للدورة</label><button className="secondary-button" type="submit">إضافة دخل متوقع</button></form>}</section><section className="foundation-card"><h2>المصادر المتوقعة</h2>{items.length===0?<p>لا يوجد دخل متوقع مسجل لهذه الدورة.</p>:<div>{items.map(x=><article key={x.id} className="foundation-card"><strong>{x.sourceName}{x.isPrimary?' — أساسي':''}</strong><p>{kindLabel[x.incomeKind]??x.incomeKind}</p><p>{formatSar(x.expectedAmount)} — {x.expectedDate}</p></article>)}</div>}</section></main>;
}
