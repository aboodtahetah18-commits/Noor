import Link from 'next/link';
import type { ReactNode } from 'react';
import { LucideIcon, type LucideIconName } from './lucide-icon';
import { PrintButton } from './print-button';

type LinkAction={label:string;href:string;icon?:LucideIconName;tone?:'default'|'primary'|'danger'};

export function EntityActionRail({actions,children,print=true}:{actions?:LinkAction[];children?:ReactNode;print?:boolean}){
  return <div className="mx-action-rail" aria-label="إجراءات العنصر">
    {actions?.map(a=><Link key={`${a.href}-${a.label}`} href={a.href} className={`mx-action-chip ${a.tone?`is-${a.tone}`:''}`}><LucideIcon name={a.icon??'eye'} size={16}/><span>{a.label}</span></Link>)}
    {children}
    {print?<PrintButton className="mx-action-chip" label="طباعة التفاصيل"/>:null}
  </div>;
}
