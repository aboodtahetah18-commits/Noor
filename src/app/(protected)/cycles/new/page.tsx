import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { createCycleAction } from '../actions';
import './full-page.css';

export default function NewCyclePage(){
  return <main className="namaa-cycle-full-page" dir="rtl">
    <div className="namaa-cycle-full-content">
      <section className="namaa-cycle-full-section" aria-labelledby="new-cycle-title">
        <header className="cycle-create-minimal-header">
          <Link href="/dashboard" className="namaa-cycle-return" aria-label="العودة إلى الرئيسية">
            <LucideIcon name="chevronRight" size={20}/>
          </Link>
          <h1 id="new-cycle-title">بداية الدورة</h1>
        </header>

        <form className="namaa-cycle-full-form" action={async(fd)=>{'use server'; await createCycleAction({},fd)}}>
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

          <div className="namaa-cycle-full-actions">
            <button className="primary-button" type="submit">بدء الدورة</button>
            <Link className="secondary-button" href="/budget">إلغاء</Link>
          </div>
        </form>
      </section>
    </div>
  </main>;
}
