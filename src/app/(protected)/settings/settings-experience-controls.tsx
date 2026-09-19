'use client';

import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/app/theme-toggle';
import { LucideIcon } from '@/components/ui/lucide-icon';

export function SettingsExperienceControls({onboardingComplete}:{onboardingComplete:boolean}){
  const [tolerance,setTolerance]=useState<2|3>(2);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(!onboardingComplete)return;
    let cancelled=false;
    fetch('/api/account/settings',{cache:'no-store'})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{
        if(cancelled||!data?.operational_settings)return;
        const value=Number(data.operational_settings.matching_tolerance_days);
        if(value===2||value===3)setTolerance(value);
      })
      .catch(()=>{});
    return()=>{cancelled=true};
  },[onboardingComplete]);

  async function saveTolerance(){
    if(!onboardingComplete||saving)return;
    setSaving(true);
    setMessage('');
    try{
      const response=await fetch('/api/account/settings',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({matching_tolerance_days:tolerance}),
      });
      if(!response.ok) throw new Error('settings');
      setMessage('تم حفظ هامش المطابقة.');
    }catch{
      setMessage('تعذر حفظ هامش المطابقة الآن.');
    }finally{
      setSaving(false);
    }
  }

  return <>
    <section className="p47-resource-card">
      <div className="p47-section-heading">
        <div><span>المظهر</span><h2>الوضع الفاتح والداكن</h2></div>
        <ThemeToggle/>
      </div>
      <p className="muted-text">هذا إعداد واجهة فقط ولا يغير أي منطق مالي.</p>
    </section>

    {onboardingComplete?<section className="p47-resource-card">
      <div className="p47-section-heading">
        <div><span>المطابقة</span><h2>هامش تاريخ التنفيذ والترحيل</h2></div>
        <small>POL-RC-001</small>
      </div>
      <div className="detail-list">
        <div>
          <span>الهامش المعتمد</span>
          <select value={tolerance} onChange={event=>setTolerance(Number(event.target.value) as 2|3)} aria-label="هامش مطابقة التاريخ">
            <option value={2}>±2 أيام</option>
            <option value={3}>±3 أيام</option>
          </select>
        </div>
        <div>
          <span>طريقة الاستخدام</span>
          <strong>مع المبلغ والحساب والاتجاه والمرجع</strong>
        </div>
      </div>
      <button className="primary-button" type="button" onClick={()=>void saveTolerance()} disabled={saving}>
        <LucideIcon name="save" size={16}/>
        <span>{saving?'جارٍ الحفظ…':'حفظ إعداد المطابقة'}</span>
      </button>
      {message?<small>{message}</small>:null}
    </section>:null}

    <section className="p47-resource-card">
      <div className="p47-section-heading"><div><span>المساعدة</span><h2>حدود نماء</h2></div></div>
      <div className="detail-list">
        <div><span>التنفيذ المالي</span><strong>المستخدم ينفذ خارجيًا ثم يثبت التنفيذ</strong></div>
        <div><span>البيانات الناقصة</span><strong>لا تخمين في القرارات الحساسة</strong></div>
        <div><span>التأسيس</span><strong>الميزات التشغيلية تبقى مقيدة حتى اكتمال الحد الأدنى</strong></div>
      </div>
    </section>
  </>;
}
