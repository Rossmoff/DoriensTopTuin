import { useEffect, useMemo, useState } from 'react';
import type { Month } from '../../domain/types';
import { bloomCalendar, gardenPlantLookup } from '../../domain/plants';
import { useGardenStore } from '../../state/gardenStore';
import { usePlantStore } from '../../state/plantStore';
import { useUiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { COLOUR_CSS, MONTH_NAMES } from '../plants/plantDisplay';

/** Month slider that tints placed plants by what flowers or colours in that month. */
export function BloomBar() {
  const month = useUiStore((s) => s.bloomMonth)!;
  const setMonth = useUiStore((s) => s.setBloomMonth);
  const placements = useGardenStore((s) => s.garden?.placements ?? []);
  const plants = usePlantStore((s) => s.plants);
  const [playing, setPlaying] = useState(false);
  const cal = useMemo(() => bloomCalendar(placements, gardenPlantLookup(plants)), [placements, plants]);
  const inFlower = cal.rows.filter((r) => r.flowering.includes(month));
  const colours = [...new Set(inFlower.flatMap((r) => r.colours))];
  const colourOnly = cal.rows.filter((r) => !r.flowering.includes(month) && r.colourMonths.includes(month)).length;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const m = useUiStore.getState().bloomMonth ?? 1;
      useUiStore.getState().setBloomMonth(((m % 12) + 1) as Month);
    }, 1200);
    return () => clearInterval(t);
  }, [playing]);

  return (
    <div className="overlay sun-bar bloom-bar" data-testid="bloom-bar">
      <div className="row">
        <button className="btn icon" aria-label={playing ? 'Pause' : 'Play the year'} onClick={() => setPlaying(!playing)}>
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          className="time-slider month-slider"
          min={1}
          max={12}
          step={1}
          value={month}
          aria-label="Month"
          aria-valuetext={MONTH_NAMES[month - 1]}
          onChange={(e) => {
            setPlaying(false);
            setMonth(Number(e.target.value) as Month);
          }}
          data-testid="bloom-month"
        />
        <strong className="month-name">{MONTH_NAMES[month - 1]}</strong>
        <button className="btn icon ghost close" aria-label="Close bloom view" onClick={() => setMonth(null)}>
          <Icon name="close" />
        </button>
      </div>
      <div className="row status" data-testid="bloom-status">
        {cal.rows.length === 0 ? (
          'Place plants to see what flowers when.'
        ) : (
          <>
            <span>
              {inFlower.length} of {cal.rows.length} plants in flower{colourOnly ? `, ${colourOnly} with berries or colour` : ''}
            </span>
            <span className="legend">
              {colours.map((c) => (
                <i key={c} title={c} style={{ background: COLOUR_CSS[c as keyof typeof COLOUR_CSS] }} />
              ))}
            </span>
            {cal.gaps.includes(month) && <span className="gap-note">Gap: nothing flowers this month</span>}
            <button className="btn" onClick={() => useUiStore.getState().setDialog('calendars')} data-testid="open-calendars">
              Calendar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
