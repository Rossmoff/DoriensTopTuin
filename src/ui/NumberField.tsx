import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  decimals?: number;
  testId?: string;
}

/** Number input that tolerates partial typing ("2.") and commits each valid value. */
export function NumberField({ label, value, onChange, min, max, step = 0.1, unit, decimals = 2, testId }: Props) {
  const id = useId();
  const fmt = (n: number) => String(Number(n.toFixed(decimals)));
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (s: string) => {
    const n = Number(s.replace(',', '.'));
    if (s.trim() === '' || !Number.isFinite(n)) return;
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {unit ? ` (${unit})` : ''}
      </span>
      <input
        id={id}
        data-testid={testId}
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(fmt(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const n = value + (e.key === 'ArrowUp' ? step : -step);
            commit(fmt(n));
          }
        }}
      />
    </label>
  );
}
