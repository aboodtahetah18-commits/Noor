'use client';

import { useMemo, useState } from 'react';
import type { CompactGovernanceStageForm } from '@/lib/governance/compact-governance-forms';

type Props={
  forms:readonly CompactGovernanceStageForm[];
  initialFormId?:string;
};

export function CompactGovernanceFormWorkspace({forms,initialFormId}:Props){
  const [selectedId,setSelectedId]=useState(initialFormId&&forms.some(item=>item.id===initialFormId)?initialFormId:forms[0]?.id??'');
  const [values,setValues]=useState<Record<string,string>>({});
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const selected=useMemo(()=>forms.find(item=>item.id===selectedId)??forms[0]??null,[forms,selectedId]);

  function switchForm(nextId:string){
    setSelectedId(nextId);
    setValues({});
    setMessage('');
  }

  async function submit(){
    if(!selected||saving)return;
    const missing=selected.fields.filter(field=>field.required&&!String(values[field.key]??'').trim());
    if(missing.length){
      setMessage('أكمل الحقول المطلوبة: '+missing.map(item=>item.label).join('، '));
      return;
    }
    setSaving(true);
    setMessage('');
    try{
      const response=await fetch('/api/governance/forms',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({formId:selected.id,values}),
      });
      const data=await response.json() as {ok?:boolean;submissionId?:string;error?:string};
      if(!response.ok||!data.ok)throw new Error(data.error??'SAVE_FAILED');
      setMessage('تم حفظ النموذج كسجل حوكمي برقم '+(data.submissionId??'—')+'.');
      setValues({});
    }catch{
      setMessage('تعذر حفظ النموذج الآن.');
    }finally{
      setSaving(false);
    }
  }

  if(!selected)return <p>لا توجد نماذج تشغيلية.</p>;

  return <div className="namaa-policy-library-layout">
    <aside className="namaa-policy-index" aria-label="قائمة النماذج">
      <div className="namaa-policy-index-head">
        <div><strong>نماذج المراحل</strong><span>{forms.length} نماذج تشغيلية</span></div>
      </div>
      <nav>
        {forms.map(form=><button
          type="button"
          key={form.id}
          className={form.id===selected.id?'is-active':''}
          onClick={()=>switchForm(form.id)}
        >
          <span className="namaa-policy-index-number">{String(form.stage).padStart(2,'0')}</span>
          <span className="namaa-policy-index-copy"><strong>{form.title}</strong><small>{form.id}</small></span>
        </button>)}
      </nav>
    </aside>

    <section className="namaa-policy-reader">
      <header className="namaa-policy-reader-head">
        <div>
          <span>المرحلة {selected.stage}</span>
          <h2>{selected.title}</h2>
          <div className="namaa-policy-reader-meta">
            <span>المالك <strong>{selected.owner}</strong></span>
            <span>النموذج <strong>{selected.id}</strong></span>
            <span>الإجراء <strong>{selected.procedureKey}</strong></span>
          </div>
        </div>
      </header>

      <section className="namaa-policy-reader-body">
        <p><strong>الهدف:</strong> {selected.purpose}</p>
        <p><strong>المحفز:</strong> {selected.trigger}</p>
        <p><strong>المخرج:</strong> {selected.output}</p>

        <div className="dashboard-list">
          {selected.fields.map(field=><label className="form-field" key={field.key}>
            <span>{field.label}{field.required?' *':''}</span>
            {field.type==='textarea'||field.type==='evidence'
              ?<textarea
                value={values[field.key]??''}
                placeholder={field.placeholder}
                onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}
              />
              :field.type==='select'||field.type==='decision'
                ?<select value={values[field.key]??''} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}>
                  <option value="">اختر</option>
                  {field.options?.map(option=><option key={option} value={option}>{option}</option>)}
                </select>
                :<input
                  type={field.type==='number'?'number':field.type==='date'?'date':'text'}
                  value={values[field.key]??''}
                  placeholder={field.placeholder}
                  onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}
                />}
          </label>)}
        </div>

        <section className="form-card">
          <strong>قائمة التحقق قبل الإغلاق</strong>
          <ol>{selected.checklist.map(item=><li key={item}>{item}</li>)}</ol>
        </section>

        {message?<p>{message}</p>:null}
        <button type="button" className="namaa-governance-open-library" disabled={saving} onClick={()=>void submit()}>
          {saving?'جارٍ الحفظ…':'حفظ النموذج كسجل حوكمي'}
        </button>
      </section>
    </section>
  </div>;
}
