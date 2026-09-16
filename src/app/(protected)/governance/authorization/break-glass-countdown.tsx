'use client';

import { useEffect, useMemo, useState } from 'react';

function format(ms:number):string {
  if (ms<=0) return 'منتهي';
  const total=Math.floor(ms/1000);
  const minutes=Math.floor(total/60);
  const seconds=total%60;
  return `${minutes}:${String(seconds).padStart(2,'0')}`;
}

export function BreakGlassCountdown({expiresAt}:{expiresAt:string}) {
  const target=useMemo(()=>Date.parse(expiresAt),[expiresAt]);
  const [remaining,setRemaining]=useState(()=>Math.max(0,target-Date.now()));
  useEffect(()=>{
    const tick=()=>setRemaining(Math.max(0,target-Date.now()));
    tick();
    const id=setInterval(tick,1000);
    return ()=>clearInterval(id);
  },[target]);
  return <span aria-live="polite">{format(remaining)}</span>;
}
