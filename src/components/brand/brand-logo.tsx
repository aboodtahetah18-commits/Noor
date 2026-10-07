'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';

type LogoSurface = 'light' | 'dark' | 'auto';

const THEME_KEY = 'namaa-theme';
const LIGHT_LOGO = '/brand/ndos/namaa-logo-color-transparent.png';
const DARK_LOGO = '/brand/ndos/namaa-logo-white-transparent.png';

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if ([THEME_KEY, 'mustaqbali-theme'].includes(event.key ?? '')) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('mustaqbali:theme-change', callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('mustaqbali:theme-change', callback);
  };
}

function serverSnapshot(): 'light' | 'dark' { return 'light'; }
function clientSnapshot(): 'light' | 'dark' {
  const current=window.localStorage.getItem('mustaqbali-theme');
  if(current==='light'||current==='dark') return current;
  return window.localStorage.getItem(THEME_KEY)==='dark'?'dark':'light';
}

export function BrandLogo({
  surface = 'auto',
  className = '',
  priority = false,
}: {
  surface?: LogoSurface;
  className?: string;
  priority?: boolean;
}) {
  const theme = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const resolvedSurface = surface === 'auto' ? theme : surface;
  if (resolvedSurface === 'dark') {
    return (
      <span
        className={`namaa-brand-logo ${className}`.trim()}
        data-brand-surface={resolvedSurface}
        style={{ position:'relative', display:'block', width:128, aspectRatio:'2 / 1' }}
      >
        <Image
          src={DARK_LOGO}
          alt="نماء"
          fill
          sizes="(max-width: 767px) 96px, (max-width: 1023px) 112px, 128px"
          priority={priority}
          draggable={false}
          style={{ objectFit:'contain' }}
        />
        <Image
          src={LIGHT_LOGO}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 767px) 96px, (max-width: 1023px) 112px, 128px"
          priority={priority}
          draggable={false}
          style={{ objectFit:'contain', clipPath:'inset(0 0 0 58%)' }}
        />
      </span>
    );
  }

  return (
    <Image
      className={`namaa-brand-logo ${className}`.trim()}
      data-brand-surface={resolvedSurface}
      src={LIGHT_LOGO}
      width={128}
      height={64}
      sizes="(max-width: 767px) 96px, (max-width: 1023px) 112px, 128px"
      alt="نماء"
      priority={priority}
      draggable={false}
    />
  );
}
