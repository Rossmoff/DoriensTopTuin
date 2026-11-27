import { useState } from 'react';
import { createGarden } from '../../data/defaults';
import { openGarden, saveNow } from '../../state/persistence';
import { useGardenStore } from '../../state/gardenStore';
import { useUiStore } from '../../state/uiStore';

export function NewGardenDialog() {
  const setDialog = useUiStore((s) => s.setDialog);
  const hasGarden = useGardenStore((s) => !!s.garden);
  const [name, setName] = useState(hasGarden ? 'New plan' : 'Our garden');
  const [width, setWidth] = useState('20');
  const [length, setLength] = useState('30');
  const [mode, setMode] = useState<'rect' | 'polygon'>('rect');
  const w = Number(width.replace(',', '.'));
  const l = Number(length.replace(',', '.'));
  const valid = name.trim() && w > 0 && l > 0 && w <= 500 && l <= 500;

  const create = async () => {
    if (!valid) return;
    const g = createGarden({ name: name.trim(), width: w, length: l });
    await saveNow(g);
    await openGarden(g);
    const ui = useUiStore.getState();
    ui.select(null);
    setDialog(null);
    if (mode === 'polygon') ui.setTool({ type: 'boundary' });
  };

  return (
    <div className="dialog-backdrop">
      <form
        className="dialog"
        role="dialog"
        aria-label="New garden plan"
        data-testid="new-garden-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <h2>New garden plan</h2>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} data-testid="new-name" />
        </label>
        <label className="check">
          <input type="radio" name="mode" checked={mode === 'rect'} onChange={() => setMode('rect')} /> Rectangular plot
        </label>
        <label className="check">
          <input type="radio" name="mode" checked={mode === 'polygon'} onChange={() => setMode('polygon')} /> Draw the boundary myself
        </label>
        <label className="field">
          <span>Width (m)</span>
          <input inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} data-testid="new-width" />
        </label>
        <label className="field">
          <span>Length (m)</span>
          <input inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} data-testid="new-length" />
        </label>
        <p className="hint">
          {mode === 'polygon'
            ? 'The width × length sets the starting view; you then tap the corners of your plot.'
            : 'Width runs left–right on the plan, length top–bottom. You can set which way is north afterwards.'}
        </p>
        <div className="actions">
          <button className="btn primary" type="submit" disabled={!valid} data-testid="create-garden">
            Create
          </button>
          {hasGarden && (
            <button className="btn" type="button" onClick={() => setDialog(null)}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
