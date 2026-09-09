import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getIncomeReceipt } from '@/features/income/queries/get-income-receipt';
import { formatSar } from '@/lib/format-money';

export default async function IncomeSuccessPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const user=await requireAuthenticatedUser(); const receipt=await getIncomeReceipt(user.id,id); if(!receipt){notFound();return null;} const {transaction:tx,variance,accountBalance:balance}=receipt;
 return <main className="foundation-page p47-closure-page" dir="rtl"><section className="foundation-card"><p className="eyebrow">تم تسجيل الدخل</p><div className="title-with-help"><h1>{formatSar(tx.amount)}</h1></div><p>رصيد الحساب بعد العملية: <strong>{formatSar(balance)}</strong></p>{variance.status==='BELOW_EXPECTED'&&<><p>الدخل الفعلي المرتبط أقل من المتوقع بمقدار {formatSar(variance.difference)}.</p><p>تحتاج الخطة إلى مراجعة؛ لن يتم تعديل الخطة المعتمدة بصمت.</p></>}{variance.status==='ABOVE_EXPECTED'&&<><p>يوجد فائض دخل قدره {formatSar(variance.difference)}.</p><p>لم يُضف الفائض تلقائيًا إلى المصروف المرن.</p></>}{variance.status==='MATCHED'&&<p>الدخل الفعلي يطابق الدخل المتوقع المرتبط.</p>}<p><a href="/dashboard">العودة إلى الرئيسية</a></p></section></main>;
}
