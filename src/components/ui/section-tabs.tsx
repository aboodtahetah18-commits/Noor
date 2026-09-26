'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type SectionTab = {
  id: string;
  label: string;
  hint?: string;
  content: ReactNode;
  disabled?: boolean;
};

export function SectionTabs({ tabs, ariaLabel = 'أقسام الصفحة' }: { tabs: SectionTab[]; ariaLabel?: string }) {
  const firstEnabled = tabs.find((tab) => !tab.disabled)?.id ?? '';
  const [active, setActive] = useState(firstEnabled);
  const baseId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const enabledIndexes = tabs.map((tab, index) => ({ tab, index })).filter(({ tab }) => !tab.disabled);

  const move = (index: number, direction: 1 | -1) => {
    if (!enabledIndexes.length) return;
    const currentPosition = enabledIndexes.findIndex((item) => item.index === index);
    const start = currentPosition >= 0 ? currentPosition : 0;
    const nextPosition = (start + direction + enabledIndexes.length) % enabledIndexes.length;
    const next = enabledIndexes[nextPosition];
    if (!next) return;
    setActive(next.tab.id);
    requestAnimationFrame(() => buttons.current[next.index]?.focus());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(index, event.key === 'ArrowRight' ? -1 : 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const first = enabledIndexes[0];
      if (first) {
        setActive(first.tab.id);
        requestAnimationFrame(() => buttons.current[first.index]?.focus());
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = enabledIndexes[enabledIndexes.length - 1];
      if (last) {
        setActive(last.tab.id);
        requestAnimationFrame(() => buttons.current[last.index]?.focus());
      }
    }
  };

  return (
    <section className="ux-section-tabs p49-section-tabs">
      <div className="ux-tabs-bar p49-tabs-bar" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab, index) => {
          const tabId = `${baseId}-${tab.id}-tab`;
          const panelId = `${baseId}-${tab.id}-panel`;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              aria-disabled={tab.disabled || undefined}
              disabled={tab.disabled}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'is-active' : ''}
              onClick={() => !tab.disabled && setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              ref={(node) => { buttons.current[index] = node; }}
            >
              <strong>{tab.label}</strong>
              {tab.hint ? <span>{tab.hint}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="ux-tab-panel p49-tab-panel">
        {tabs.map((tab) => {
          const tabId = `${baseId}-${tab.id}-tab`;
          const panelId = `${baseId}-${tab.id}-panel`;
          return (
            <div key={tab.id} id={panelId} role="tabpanel" aria-labelledby={tabId} tabIndex={0} hidden={active !== tab.id}>
              {tab.content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
