'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { LucideIcon, type LucideIconName } from '@/components/ui/lucide-icon';

export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'mustaqbali-theme';

const THEME_STATES: Record<ThemePreference, {
  next: ThemePreference;
  label: string;
  icon: LucideIconName;
}> = {
  light: {
    next: 'dark',
    label: 'تفعيل المظهر الداكن',
    icon: 'moon',
  },
  dark: {
    next: 'light',
    label: 'تفعيل المظهر الفاتح',
    icon: 'sun',
  },
};

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : 'light';
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function getThemeSnapshot(): ThemePreference {
  return readStoredThemePreference();
}

function getServerThemeSnapshot(): ThemePreference {
  return 'light';
}

function subscribeTheme(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  const onThemeChange = () => callback();

  window.addEventListener('storage', onStorage);
  window.addEventListener('mustaqbali:theme-change', onThemeChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('mustaqbali:theme-change', onThemeChange);
  };
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const preference = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  function toggleTheme() {
    const next = THEME_STATES[preference].next;
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event('mustaqbali:theme-change'));
  }

  const state = THEME_STATES[preference];

  return (
    <button
      type="button"
      className={`mustaqbali-theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={state.label}
      aria-pressed={preference === 'dark'}
    >
      <LucideIcon name={state.icon} size={20} />
    </button>
  );
}
