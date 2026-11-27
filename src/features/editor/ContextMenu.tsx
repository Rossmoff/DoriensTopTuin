import { useGardenStore } from '../../state/gardenStore';
import { useUiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { useObjectActions } from '../panels/useObjectActions';

/** Long-press / right-click menu for an object. */
export function ContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const close = () => useUiStore.getState().openContextMenu(null);
  // The click that follows lifting the finger after a long-press must not close the menu.
  const closeFromBackdrop = () => {
    const m = useUiStore.getState().contextMenu;
    if (m && Date.now() - (m.openedAt ?? 0) > 500) close();
  };
  const obj = useGardenStore((s) => s.garden?.objects.find((o) => o.id === menu?.objectId));
  const placement = useGardenStore((s) => s.garden?.placements.find((p) => p.id === menu?.objectId));
  const actions = useObjectActions(obj?.id ?? placement?.id ?? null);
  if (!menu || (!obj && !placement)) return null;

  const left = Math.min(menu.screen.x, window.innerWidth - 240);
  const top = Math.max(8, Math.min(menu.screen.y + 16, window.innerHeight - 400));
  const run = (fn: () => void) => () => {
    fn();
    close();
  };
  if (!obj) {
    return (
      <>
        <div className="backdrop" onClick={closeFromBackdrop} />
        <div className="popover menu" style={{ left, top, position: 'fixed' }} role="menu" data-testid="context-menu">
          <button className="btn" role="menuitem" onClick={run(actions.showProperties)}>
            Properties…
          </button>
          <button className="btn" role="menuitem" onClick={run(actions.duplicate)}>
            <Icon name="copy" /> Duplicate
          </button>
          <button className="btn danger" role="menuitem" onClick={run(actions.remove)}>
            <Icon name="trash" /> Remove plant
          </button>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="backdrop" onClick={closeFromBackdrop} onContextMenu={(e) => (e.preventDefault(), closeFromBackdrop())} />
      <div className="popover menu" style={{ left, top, position: 'fixed' }} role="menu" data-testid="context-menu">
        <strong style={{ padding: '4px 12px' }}>{obj.label}</strong>
        <button className="btn" role="menuitem" onClick={run(actions.showProperties)}>
          Properties…
        </button>
        <button className="btn" role="menuitem" onClick={run(actions.duplicate)}>
          <Icon name="copy" /> Duplicate
        </button>
        <button className="btn" role="menuitem" onClick={run(() => actions.rotate(90))} disabled={obj.geometry.type === 'circle'}>
          <Icon name="rotate" /> Rotate 90°
        </button>
        <button className="btn" role="menuitem" onClick={run(() => actions.reorder('front'))}>
          <Icon name="front" /> Bring to front
        </button>
        <button className="btn" role="menuitem" onClick={run(() => actions.reorder('back'))}>
          <Icon name="back" /> Send to back
        </button>
        <button className="btn" role="menuitem" onClick={run(actions.toggleLock)}>
          <Icon name="lock" /> {obj.locked ? 'Unlock' : 'Lock'}
        </button>
        <hr />
        <button className="btn danger" role="menuitem" onClick={run(actions.remove)}>
          <Icon name="trash" /> Delete
        </button>
      </div>
    </>
  );
}
