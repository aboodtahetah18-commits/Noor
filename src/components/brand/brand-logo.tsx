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
  return window.localStorage.getItem(THEME_KEY) === 'dark' || window.localStorage.getItem('mustaqbali-theme') === 'dark'
    ? 'dark'
    : 'light';
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
  const src = resolvedSurface === 'dark' ? DARK_LOGO : LIGHT_LOGO;

  return (
    <Image
      className={`namaa-brand-logo ${className}`.trim()}
      data-brand-surface={resolvedSurface}
      src={src}
      width={128}
      height={64}
      sizes="(max-width: 767px) 96px, (max-width: 1023px) 112px, 128px"
      alt="نماء"
      priority={priority}
      draggable={false}
    />
  );
}
