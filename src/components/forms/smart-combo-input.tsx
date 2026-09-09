'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';

type SmartComboInputProps = {
  name: string;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
  ariaLabel?: string;
};

export function SmartComboInput({
  name,
  options,
  placeholder,
  required,
  maxLength = 120,
  defaultValue = '',
  ariaLabel,
}: SmartComboInputProps) {
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = value.trim().toLocaleLowerCase('ar');
    if (!needle) return [...options];
    return options.filter((item) => item.toLocaleLowerCase('ar').includes(needle));
  }, [options, value]);

  function choose(option: string) {
    setValue(option);
    setOpen(false);
  }

  return (
    <div className="smart-combo">
      <input
        name={name}
        value={value}
        onChange={(event) => { setValue(event.target.value); setOpen(true); }}
        onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setOpen(true); }}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className="smart-combo-toggle"
        aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
      >
        <LucideIcon name={open ? 'chevronUp' : 'chevronDown'} size={20} />
      </button>
      {open ? (
        <div className="smart-combo-menu" id={listId} role="listbox">
          {filtered.length ? filtered.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option === value}
              className="smart-combo-option"
              key={option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option}
            </button>
          )) : (
            <div className="smart-combo-empty">سيُحفظ «{value.trim()}» كخيار جديد</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
