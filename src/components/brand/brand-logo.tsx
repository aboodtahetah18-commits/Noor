'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';

type LogoSurface = 'light' | 'dark' | 'auto';
const LIGHT_KEY = 'mustaqbali-logo-light';
const DARK_KEY = 'mustaqbali-logo-dark';
const THEME_KEY = 'mustaqbali-theme';
const EVENT = 'mustaqbali:brand-logo-change';

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if ([LIGHT_KEY, DARK_KEY, THEME_KEY].includes(event.key ?? '')) callback();
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

function serverSnapshot() {
  return JSON.stringify({light:'',dark:'',theme:'light'});
}

function clientSnapshot() {
  return JSON.stringify({
    light: window.localStorage.getItem(LIGHT_KEY) ?? '',
    dark: window.localStorage.getItem(DARK_KEY) ?? '',
    theme: window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light',
  });
}

export function BrandLogo({surface='auto',className='',priority=false}:{surface?:LogoSurface;className?:string;priority?:boolean}) {
  const snapshot = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const data = JSON.parse(snapshot) as {light:string;dark:string;theme:'light'|'dark'};
  const resolved = surface === 'auto' ? data.theme : surface;
  const custom = resolved === 'dark' ? data.dark : data.light;
  const src = custom || (resolved === 'dark' ? '/brand/mustaqbali-logo-white-compact.png' : '/brand/mustaqbali-logo.png');
  return <Image className={className} src={src} width={245} height={115} alt="مستقبلي" priority={priority} unoptimized={src.startsWith('data:')} />;
}

export const brandLogoStorage = {LIGHT_KEY,DARK_KEY,EVENT} as const;
