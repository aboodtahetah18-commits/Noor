'use client';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

type Tab = { id:string; label:string; hint?:string; content:ReactNode };
export function SectionTabs({tabs, ariaLabel='أقسام الصفحة'}:{tabs:Tab[];ariaLabel?:string}){
  const [active,setActive]=useState(tabs[0]?.id ?? '');
  const baseId=useId();
  const buttons=useRef<Array<HTMLButtonElement|null>>([]);

  const move=(index:number)=>{
    const safe=(index+tabs.length)%tabs.length;
    const next=tabs[safe];
    if(!next) return;
    setActive(next.id);
    requestAnimationFrame(()=>buttons.current[safe]?.focus());
  };

  const onKeyDown=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();
      move(index+(event.key==='ArrowRight'?-1:1));
    } else if(event.key==='Home'){
      event.preventDefault(); move(0);
    } else if(event.key==='End'){
      event.preventDefault(); move(tabs.length-1);
    }
  };

  return <section className="p49-section-tabs">
    <div className="p49-tabs-bar" role="tablist" aria-label={ariaLabel}>{tabs.map((tab,index)=>{
      const tabId=`${baseId}-${tab.id}-tab`;
      const panelId=`${baseId}-${tab.id}-panel`;
      const selected=active===tab.id;
      return <button key={tab.id} id={tabId} type="button" role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected?0:-1} className={selected?'is-active':''} onClick={()=>setActive(tab.id)} onKeyDown={event=>onKeyDown(event,index)} ref={node=>{buttons.current[index]=node;}}><strong>{tab.label}</strong>{tab.hint?<span>{tab.hint}</span>:null}</button>;
    })}</div>
    <div className="p49-tab-panel">{tabs.map(tab=>{
      const tabId=`${baseId}-${tab.id}-tab`;
      const panelId=`${baseId}-${tab.id}-panel`;
      return <div key={tab.id} id={panelId} role="tabpanel" aria-labelledby={tabId} tabIndex={0} hidden={active!==tab.id}>{tab.content}</div>;
    })}</div>
  </section>;
}
