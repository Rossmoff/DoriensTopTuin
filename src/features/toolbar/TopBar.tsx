import { useRef, useState } from 'react';
import type { Month } from '../../domain/types';
import { useGardenStore } from '../../state/gardenStore';
import { useUiStore, type Theme } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { useDrawStore } from '../editor/drawStore';
import { exportJson, exportPng, importJsonFile, pickFile } from '../plans/fileActions';
import { AddMenu } from './AddMenu';
import { useSunStore } from '../../state/sunStore';
import { usePlantUi } from '../plants/plantUiStore';
import { usePlanWarnings } from '../placement/usePlanWarnings';
import { exportShoppingList } from '../calendars/CalendarsDialog';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'contrast', label: 'High contrast (sunlight)' },
];

export function TopBar() {
  const garden = useGardenStore((s) => s.garden);
  const canUndo = useGardenStore((s) => s.past.length > 0);
  const canRedo = useGardenStore((s) => s.future.length > 0);
  const { undo, redo } = useGardenStore.getState();
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const setDialog = useUiStore((s) => s.setDialog);
  const addOpen = useUiStore((s) => s.addMenuOpen);
  const setAddOpen = useUiStore((s) => s.setAddMenuOpen);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const showToast = useUiStore((s) => s.showToast);
  const [moreOpen, setMoreOpen] = useState(false);
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const walk = mode === 'walk';
  const addRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  const anchorOf = (el: HTMLElement | null) => {
    const r = el?.getBoundingClientRect();
    return { left: r?.left ?? 8, top: (r?.bottom ?? 50) + 6 };
  };
  const more = (fn: () => void) => () => {
    setMoreOpen(false);
    fn();
  };

  return (
    <header className="topbar">
      <button className="btn ghost plan-name" onClick={() => setDialog('plans')} data-testid="plans-button" title="Your plans">
        <Icon name="folder" />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{garden?.name ?? 'Plans'}</span>
      </button>
      {!walk && (
        <>
      <div className="sep" />
      <button className="btn icon ghost" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" data-testid="undo">
        <Icon name="undo" />
      </button>
      <button className="btn icon ghost only-wide" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" data-testid="redo">
        <Icon name="redo" />
      </button>
      <div className="sep" />
      <button
        className={`btn ghost only-wide ${tool.type === 'select' ? 'active' : ''}`}
        onClick={() => setTool({ type: 'select' })}
        aria-pressed={tool.type === 'select'}
        title="Select and move (Esc)"
      >
        <Icon name="cursor" /> Select
      </button>
      <button
        ref={addRef}
        className={`btn ${tool.type === 'draw' || addOpen ? 'active' : 'primary'}`}
        onClick={() => setAddOpen(!addOpen)}
        aria-haspopup="menu"
        aria-expanded={addOpen}
        data-testid="add-button"
      >
        <Icon name="plus" /> <span className="only-wide">Add</span>
      </button>
      <button
        className={`btn ghost only-wide ${tool.type === 'measure' ? 'active' : ''}`}
        onClick={() => {
          useDrawStore.getState().reset();
          setTool(tool.type === 'measure' ? { type: 'select' } : { type: 'measure' });
        }}
        aria-pressed={tool.type === 'measure'}
        aria-label="Measure"
        title="Measure distance"
        data-testid="measure-button"
      >
        <Icon name="ruler" /> <span className="only-wide">Measure</span>
      </button>
        </>
      )}
      <button
        className={`btn ghost ${walk ? 'active' : ''}`}
        onClick={() => setMode(walk ? 'edit' : 'walk')}
        aria-pressed={walk}
        aria-label="Garden walk"
        title="Garden walk: tap a spot for sun, soil and plant suggestions"
        data-testid="walk-button"
      >
        <Icon name="walk" /> <span className="only-wide">{walk ? 'Done' : 'Walk'}</span>
      </button>
      <SunToggle />
      {!walk && <BloomToggle className="only-wide" />}
      <div className="spacer" />
      <WarningsButton />
      <button ref={moreRef} className="btn icon ghost" onClick={() => setMoreOpen(!moreOpen)} aria-label="More" aria-haspopup="menu" data-testid="more-button">
        <Icon name="more" />
      </button>

      {addOpen && <AddMenu anchor={anchorOf(addRef.current)} />}
      {moreOpen && (
        <>
          <div className="backdrop" onClick={() => setMoreOpen(false)} />
          <div
            className="popover menu"
            style={{ position: 'fixed', right: 8, top: anchorOf(moreRef.current).top }}
            role="menu"
            data-testid="more-menu"
          >
            {!walk && (
              <div className="only-narrow-block">
                <button className="btn" role="menuitem" onClick={more(redo)} disabled={!canRedo}>
                  <Icon name="redo" /> Redo
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={more(() => {
                    useDrawStore.getState().reset();
                    setTool({ type: 'measure' });
                  })}
                >
                  <Icon name="ruler" /> Measure
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  data-testid="menu-bloom"
                  onClick={more(() => {
                    useSunStore.getState().set({ view: 'off', playing: false, probe: null });
                    useUiStore.getState().setBloomMonth((new Date().getMonth() + 1) as Month);
                  })}
                >
                  <Icon name="flower" /> Bloom view
                </button>
                <hr />
              </div>
            )}
            <button className="btn" role="menuitem" onClick={more(() => setDialog('plans'))}>
              <Icon name="folder" /> Plans…
            </button>
            <button className="btn" role="menuitem" onClick={more(() => setDialog('new'))}>
              <Icon name="plus" /> New plan…
            </button>
            <button className="btn" role="menuitem" onClick={more(() => usePlantUi.getState().set({ libraryOpen: true }))} data-testid="open-library">
              <Icon name="leaf" /> Plant library…
            </button>
            <button className="btn" role="menuitem" onClick={more(() => setDialog('calendars'))} data-testid="menu-calendars">
              <Icon name="calendar" /> Bloom &amp; vegetable calendars…
            </button>
            <button className="btn" role="menuitem" onClick={more(() => setDialog('check'))} data-testid="menu-check">
              <Icon name="alert" /> Plan check…
            </button>
            <hr />
            <button className="btn" role="menuitem" disabled={!garden?.placements.length} onClick={more(exportShoppingList)}>
              <Icon name="download" /> Export plant list (CSV)
            </button>
            <button className="btn" role="menuitem" disabled={!garden} onClick={more(() => garden && exportJson(garden))} data-testid="export-json">
              <Icon name="download" /> Export JSON
            </button>
            <button
              className="btn"
              role="menuitem"
              onClick={more(async () => {
                const f = await pickFile('.json,application/json');
                if (!f) return;
                try {
                  await importJsonFile(f);
                } catch (e) {
                  showToast((e as Error).message);
                }
              })}
            >
              <Icon name="upload" /> Import JSON…
            </button>
            <button className="btn" role="menuitem" disabled={!garden} onClick={more(() => void exportPng())} data-testid="export-png">
              <Icon name="image" /> Export PNG
            </button>
            <hr />
            <button className="btn" role="menuitem" onClick={more(() => setTool({ type: 'boundary' }))}>
              <Icon name="polygon" /> Redraw plot boundary
            </button>
            <hr />
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`btn ${theme === t.id ? 'active' : ''}`}
                role="menuitemradio"
                aria-checked={theme === t.id}
                onClick={more(() => setTheme(t.id))}
                data-testid={`theme-${t.id}`}
              >
                <Icon name={theme === t.id ? 'check' : 'sun'} /> {t.label}
              </button>
            ))}
            <hr />
            <button className="btn" role="menuitem" onClick={more(() => setDialog('about'))}>
              About & help
            </button>
          </div>
        </>
      )}
    </header>
  );
}

function SunToggle() {
  const view = useSunStore((s) => s.view);
  const set = useSunStore((s) => s.set);
  const on = view !== 'off';
  return (
    <button
      className={`btn ghost ${on ? 'active' : ''}`}
      onClick={() => {
        if (!on) useUiStore.getState().setBloomMonth(null);
        set(on ? { view: 'off', playing: false, probe: null } : { view: 'shadows' });
      }}
      aria-pressed={on}
      aria-label="Sun and shade"
      title="Sun and shade"
      data-testid="sun-button"
    >
      <Icon name="sun" /> <span className="only-wide">Sun</span>
    </button>
  );
}

function BloomToggle({ className = '' }: { className?: string }) {
  const month = useUiStore((s) => s.bloomMonth);
  const on = month !== null;
  return (
    <button
      className={`btn ghost ${className} ${on ? 'active' : ''}`}
      onClick={() => {
        if (on) useUiStore.getState().setBloomMonth(null);
        else {
          useSunStore.getState().set({ view: 'off', playing: false, probe: null });
          const now = new Date().getMonth() + 1;
          useUiStore.getState().setBloomMonth(now as Month);
        }
      }}
      aria-pressed={on}
      aria-label="Bloom view"
      title="Bloom view: what flowers when"
      data-testid="bloom-button"
    >
      <Icon name="flower" /> <span className="only-wide">Bloom</span>
    </button>
  );
}

function WarningsButton() {
  const warnings = usePlanWarnings();
  const n = warnings.filter((w) => w.severity === 'warn').length;
  if (n === 0) return null;
  return (
    <button className="btn ghost warn-btn" onClick={() => useUiStore.getState().setDialog('check')} aria-label={`${n} plan warnings`} title="Plan check" data-testid="warnings-button">
      <Icon name="alert" /> {n}
    </button>
  );
}
