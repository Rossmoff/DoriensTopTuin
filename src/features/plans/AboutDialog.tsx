import { useUiStore } from '../../state/uiStore';

export function AboutDialog() {
  const setDialog = useUiStore((s) => s.setDialog);
  return (
    <div className="dialog-backdrop" onClick={() => setDialog(null)}>
      <div className="dialog" role="dialog" aria-label="About" onClick={(e) => e.stopPropagation()}>
        <h2>Dorien&apos;s Tuin Tafereel</h2>
        <p>
          Plan the garden to scale, see sun and shade through the year, and find plants that suit each spot: tap a bed and open its
          Plants tab, or use Walk to tap any spot. Place plants with “+”, then check the plan (⚠), the bloom view and the calendars.
        </p>
        <h3>Mouse &amp; keyboard</h3>
        <ul className="hint">
          <li>Drag empty space to pan, scroll to zoom.</li>
          <li>Click to select, drag to move, right-click for more.</li>
          <li>Delete removes, Ctrl+D duplicates, arrow keys nudge (Shift = 1 m).</li>
          <li>Ctrl+Z / Ctrl+Shift+Z undo and redo. Esc cancels a tool.</li>
        </ul>
        <h3>Touch</h3>
        <ul className="hint">
          <li>One finger pans; two fingers pinch to zoom.</li>
          <li>Tap to select, then drag the selected object to move it.</li>
          <li>Long-press an object for duplicate, rotate, lock and delete.</li>
        </ul>
        <p className="hint">Plant photos come from Wikimedia Commons under free licences; each plant's details name the photographer and licence.</p>
        <p className="hint">Plans are stored on this device only. Use Export JSON to move a plan to another device.</p>
        <div className="actions">
          <button className="btn primary" onClick={() => setDialog(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
