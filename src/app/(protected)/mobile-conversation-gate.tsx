'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const MOBILE_QUERY='(max-width: 767px)';

export function MobileConversationGate({children}:{children:ReactNode}){
  const pathname=usePathname();
  const router=useRouter();

  useEffect(()=>{
    if(pathname.startsWith('/conversations')) return;

    const media=window.matchMedia(MOBILE_QUERY);
    const enforce=()=>{
      if(media.matches) router.replace('/conversations');
    };

    enforce();
    media.addEventListener('change',enforce);
    return()=>media.removeEventListener('change',enforce);
  },[pathname,router]);

  return <>{children}</>;
}
