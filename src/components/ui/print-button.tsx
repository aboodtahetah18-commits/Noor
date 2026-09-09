'use client';

import { LucideIcon } from './lucide-icon';

export function PrintButton({className='p49-dialog-print',label='طباعة'}:{className?:string;label?:string}){
  return <button type="button" className={className} onClick={()=>window.print()} aria-label={label} title={label}><LucideIcon name="printer" size={20}/></button>;
}
