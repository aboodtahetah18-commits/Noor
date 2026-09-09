import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { createCycleAction } from '../actions';

export default function NewCyclePage(){
  return <main className="app-page cycle-create-page cycle-create-page--focused p47-shell p47-closure-page" data-p47-shell="true" dir="rtl">
    <div className="page-shell narrow-shell cycle-create-focus-shell">
      <section className="card cycle-create-card cycle-create-card--focused" aria-labelledby="new-cycle-title">
        <header className="cycle-create-minimal-header">
          <Link href="/budget" className="cycle-create-close" aria-label="العودة إلى التخطيط والميزانية">
            <LucideIcon name="x" size={20}/>
          </Link>
          <h1 id="new-cycle-title">بداية الدورة</h1>
        </header>

        <form className="cycle-create-form cycle-create-form--focused" action={async(fd)=>{'use server'; await createCycleAction({},fd)}}>
          <label className="cycle-field cycle-field-full">
            <span>اسم الدورة</span>
            <input name="name" required placeholder="مثال: سبتمبر 2026"/>
          </label>

          <label className="cycle-field">
            <span>تاريخ البداية</span>
            <input name="startDate" type="date" required/>
          </label>

          <label className="cycle-field">
            <span>تاريخ الدخل القادم</span>
            <input name="expectedNextIncomeDate" type="date" required/>
          </label>

          <div className="cycle-create-actions cycle-create-actions--focused">
            <button className="primary-button" type="submit">بدء الدورة</button>
            <Link className="secondary-button" href="/budget">إلغاء</Link>
          </div>
        </form>
      </section>
    </div>
  </main>;
}
