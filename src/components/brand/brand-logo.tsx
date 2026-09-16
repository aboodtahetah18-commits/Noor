'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';

type LogoSurface = 'light' | 'dark' | 'auto';
const LIGHT_KEY = 'namaa-logo-light';
const DARK_KEY = 'namaa-logo-dark';
const THEME_KEY = 'namaa-theme';
const EVENT = 'namaa:brand-logo-change';
const DEFAULT_LOGO = '/brand/ndos/namaa-logo-official.png';

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if ([LIGHT_KEY, DARK_KEY, THEME_KEY, 'mustaqbali-theme'].includes(event.key ?? '')) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, callback);
  window.addEventListener('mustaqbali:theme-change', callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('mustaqbali:theme-change', callback);
  };
}

function serverSnapshot() { return 'light'; }
function clientSnapshot() {
  return window.localStorage.getItem(THEME_KEY) === 'dark' || window.localStorage.getItem('mustaqbali-theme') === 'dark' ? 'dark' : 'light';
}

export function BrandLogo({ className = '', priority = false }: { surface?: LogoSurface; className?: string; priority?: boolean }) {
  useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return (
    <Image
      className={className}
      src={DEFAULT_LOGO}
      width={250}
      height={180}
      sizes="(max-width: 767px) 96px, (max-width: 1023px) 112px, 128px"
      alt="نماء"
      priority={priority}
    />
  );
}

export const brandLogoStorage = { LIGHT_KEY, DARK_KEY, EVENT } as const;
