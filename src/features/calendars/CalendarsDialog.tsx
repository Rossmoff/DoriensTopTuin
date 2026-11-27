import { useMemo, useState } from 'react';
import type { Month } from '../../domain/types';
import { bloomCalendar, gardenPlantLookup, MONTHS, shoppingListCsv, vegCalendar, vegTasks, type VegRow } from '../../domain/plants';
import { zonedParts } from '../../domain/sun';
import { useGardenStore } from '../../state/gardenStore';
import { usePlantStore } from '../../state/plantStore';
import { useUiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { COLOUR_CSS, MONTH_NAMES, MONTH_SHORT } from '../plants/plantDisplay';
import { downloadBlob } from '../plans/fileActions';
import { PlantThumb } from '../plants/PlantThumb';

function cellBackground(colours: string[]): string {
  const css = colours.map((c) => COLOUR_CSS[c as keyof typeof COLOUR_CSS] ?? '#7cb35b');
  if (css.length <= 1) return css[0] ?? '#7cb35b';
  const step = 100 / css.length;
  return `linear-gradient(135deg, ${css.map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`).join(', ')})`;
}

export function exportShoppingList() {
  const g = useGardenStore.getState().garden;
  if (!g) return;
  const csv = shoppingListCsv(g.placements, gardenPlantLookup(usePlantStore.getState().plants), g.name);
  downloadBlob(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), `${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garden'}-plants.csv`);
}

function BloomTable() {
  const placements = useGardenStore((s) => s.garden?.placements ?? []);
  const plants = usePlantStore((s) => s.plants);
  const cal = useMemo(() => bloomCalendar(placements, gardenPlantLookup(plants)), [placements, plants]);
  if (cal.rows.length === 0) return <p className="hint">No ornamental plants placed yet.</p>;
  const max = Math.max(1, ...cal.inFlower);
  return (
    <>
      {cal.gaps.length > 0 ? (
        <p className="gap-note" data-testid="bloom-gaps">
          Gaps in the season: nothing flowers in {cal.gaps.map((m) => MONTH_NAMES[m - 1]).join(', ')}.
        </p>
      ) : (
        <p className="hint">Something flowers in every month from March to October. 🌼</p>
      )}
      <div className="cal-wrap">
        <table className="cal" data-testid="bloom-calendar">
          <thead>
            <tr>
              <th />
              {MONTH_SHORT.map((m, i) => (
                <th key={i} title={MONTH_NAMES[i]}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="coverage">
              <th>In flower</th>
              {cal.inFlower.map((n, i) => (
                <td key={i} className={cal.gaps.includes((i + 1) as Month) ? 'gap' : ''} title={`${n} plants in flower`}>
                  <div className="bar" style={{ height: `${(n / max) * 100}%` }} />
                  <span>{n || ''}</span>
                </td>
              ))}
            </tr>
            {cal.rows.map((r) => (
              <tr key={r.plant.id}>
                <th>
                  <PlantThumb plant={r.plant} size={22} /> {r.plant.names.en}
                  <small> ×{r.quantity}</small>
                </th>
                {MONTHS.map((m) => {
                  const fl = r.flowering.includes(m);
                  const col = r.colourMonths.includes(m);
                  return (
                    <td key={m}>
                      {fl ? <div className="fill" style={{ background: cellBackground(r.colours) }} /> : col ? <div className="fill berries" /> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="legend-line">
        <span><i className="swatch" style={{ background: cellBackground(['pink', 'white']) }} /> flowering (flower colours)</span>
        <span><i className="swatch berries-swatch" /> berries, autumn colour or bark</span>
      </p>
    </>
  );
}

const VEG_KINDS: { key: keyof Pick<VegRow, 'sowIndoors' | 'sowOutdoors' | 'plantOut' | 'harvest'>; label: string; cls: string }[] = [
  { key: 'sowIndoors', label: 'Sow indoors', cls: 'sow-in' },
  { key: 'sowOutdoors', label: 'Sow outdoors', cls: 'sow-out' },
  { key: 'plantOut', label: 'Plant out', cls: 'plant-out' },
  { key: 'harvest', label: 'Harvest', cls: 'harvest' },
];

function VegTable() {
  const placements = useGardenStore((s) => s.garden?.placements ?? []);
  const plants = usePlantStore((s) => s.plants);
  const tz = useGardenStore((s) => s.garden?.location.timeZone ?? 'Europe/Brussels');
  const rows = useMemo(() => vegCalendar(placements, gardenPlantLookup(plants)), [placements, plants]);
  const now = zonedParts(new Date(), tz).month as Month;
  if (rows.length === 0) return <p className="hint">No vegetables, herbs or fruit placed yet.</p>;
  const tasks = vegTasks(rows, now);
  return (
    <>
      <div className="tasks" data-testid="veg-tasks">
        <strong>This month ({MONTH_NAMES[now - 1]}):</strong>
        {VEG_KINDS.map((k) => (tasks[k.key].length ? <span key={k.key}><i className={`mark ${k.cls}`} /> {k.label}: {tasks[k.key].join(', ')}</span> : null))}
        {VEG_KINDS.every((k) => tasks[k.key].length === 0) && <span>nothing to sow, plant or harvest.</span>}
      </div>
      <div className="cal-wrap">
        <table className="cal veg" data-testid="veg-calendar">
          <thead>
            <tr>
              <th />
              {MONTH_SHORT.map((m, i) => (
                <th key={i} className={i + 1 === now ? 'now' : ''} title={MONTH_NAMES[i]}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.plant.id}>
                <th>
                  <PlantThumb plant={r.plant} size={22} /> {r.plant.names.en}
                  <small> ×{r.quantity}</small>
                </th>
                {MONTHS.map((m) => (
                  <td key={m} className={m === now ? 'now' : ''}>
                    <div className="marks">
                      {VEG_KINDS.map((k) => (r[k.key].includes(m) ? <i key={k.key} className={`mark ${k.cls}`} title={k.label} /> : null))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="legend-line">
        {VEG_KINDS.map((k) => (
          <span key={k.key}>
            <i className={`mark ${k.cls}`} /> {k.label}
          </span>
        ))}
      </p>
    </>
  );
}

export function CalendarsDialog() {
  const setDialog = useUiStore((s) => s.setDialog);
  const name = useGardenStore((s) => s.garden?.name ?? '');
  const [tab, setTab] = useState<'bloom' | 'veg'>('bloom');
  return (
    <div className="dialog-backdrop" onClick={() => setDialog(null)}>
      <div className="dialog calendars printable" role="dialog" aria-label="Calendars" onClick={(e) => e.stopPropagation()} data-testid="calendars">
        <div className="dialog-head">
          <h2>{name}: calendars</h2>
          <button className="btn icon ghost no-print" aria-label="Close" onClick={() => setDialog(null)}>
            <Icon name="close" />
          </button>
        </div>
        <div className="seg wide tabs no-print" role="tablist">
          <button className={`btn ${tab === 'bloom' ? 'active' : ''}`} role="tab" aria-selected={tab === 'bloom'} onClick={() => setTab('bloom')} data-testid="tab-bloom">
            Bloom calendar
          </button>
          <button className={`btn ${tab === 'veg' ? 'active' : ''}`} role="tab" aria-selected={tab === 'veg'} onClick={() => setTab('veg')} data-testid="tab-veg">
            Vegetables
          </button>
        </div>
        <h3 className="print-only">{tab === 'bloom' ? 'Bloom calendar' : 'Vegetable calendar'}</h3>
        {tab === 'bloom' ? <BloomTable /> : <VegTable />}
        <div className="actions no-print">
          <button className="btn" onClick={() => window.print()}>
            Print / save as PDF
          </button>
          <button className="btn" onClick={exportShoppingList} data-testid="export-csv">
            <Icon name="download" /> Plant list (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
