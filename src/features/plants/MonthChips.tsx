import type { Month } from '../../domain/types';
import { MONTH_NAMES, MONTH_SHORT } from './plantDisplay';

/** 12 toggleable month chips (read-only when no onChange). */
export function MonthChips({ value, onChange, label, color = 'var(--accent)' }: { value: number[]; onChange?: (m: Month[]) => void; label: string; color?: string }) {
  const set = new Set(value);
  return (
    <div className="months" role="group" aria-label={label}>
      {MONTH_SHORT.map((s, i) => {
        const m = (i + 1) as Month;
        const on = set.has(m);
        const style = on ? { background: color, color: '#fff', borderColor: color } : undefined;
        return onChange ? (
          <button
            key={i}
            type="button"
            className={`month ${on ? 'on' : ''}`}
            style={style}
            aria-pressed={on}
            aria-label={MONTH_NAMES[i]}
            onClick={() => onChange((on ? value.filter((x) => x !== m) : [...value, m]).sort((a, b) => a - b) as Month[])}
          >
            {s}
          </button>
        ) : (
          <span key={i} className={`month ${on ? 'on' : ''}`} style={style} title={MONTH_NAMES[i]}>
            {s}
          </span>
        );
      })}
    </div>
  );
}
