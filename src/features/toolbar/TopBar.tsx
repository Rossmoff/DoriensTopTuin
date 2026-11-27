import { useRef, useState } from 'react';
import { useGardenStore } from '../../state/gardenStore';
import { useUiStore, type Theme } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { useDrawStore } from '../editor/drawStore';
import { exportJson, exportPng, importJsonFile, pickFile } from '../plans/fileActions';
import { AddMenu } from './AddMenu';
import { useSunStore } from '../../state/sunStore';

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
      <div className="sep" />
      <button className="btn icon ghost" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" data-testid="undo">
        <Icon name="undo" />
      </button>
      <button className="btn icon ghost" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" data-testid="redo">
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
        className={`btn ghost ${tool.type === 'measure' ? 'active' : ''}`}
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
      <SunToggle />
      <div className="spacer" />
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
            <button className="btn" role="menuitem" onClick={more(() => setDialog('plans'))}>
              <Icon name="folder" /> Plans…
            </button>
            <button className="btn" role="menuitem" onClick={more(() => setDialog('new'))}>
              <Icon name="plus" /> New plan…
            </button>
            <hr />
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
      onClick={() => set(on ? { view: 'off', playing: false, probe: null } : { view: 'shadows' })}
      aria-pressed={on}
      aria-label="Sun and shade"
      title="Sun and shade"
      data-testid="sun-button"
    >
      <Icon name="sun" /> <span className="only-wide">Sun</span>
    </button>
  );
}
