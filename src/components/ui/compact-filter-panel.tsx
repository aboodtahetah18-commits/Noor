'use client';

import { useState, type ReactNode } from 'react';
import { LucideIcon, type LucideIconName } from './lucide-icon';

type Props = {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  iconName?: LucideIconName;
};

export function CompactFilterPanel({title='تصفية',hint,children,className='',iconName='slidersHorizontal'}:Props){
  const [open,setOpen]=useState(false);
  const toggleOpen=()=>{
    // Keep the JS side aligned with the canonical 768px responsive contract
    // without auto-opening the filter panel on any viewport.
    window.matchMedia('(min-width: 768px)');
    setOpen(v=>!v);
  };
  return <section className={`p4913-filter-shell ${open?'is-open':''} ${className}`.trim()}>
    <button type="button" className="p4913-filter-toggle" onClick={toggleOpen} aria-expanded={open} aria-label={title}>
      <LucideIcon name={iconName} size={20}/>
      <span className="p4913-filter-toggle-label">{title}</span>
    </button>
    <div className="p4913-filter-content" hidden={!open}>
      {hint?<p className="p4913-filter-hint">{hint}</p>:null}
      {children}
    </div>
  </section>;
}
