import { GROUPS, KIND_LIST } from '../../data/objectCatalog';
import { useUiStore } from '../../state/uiStore';
import { useDrawStore } from '../editor/drawStore';

export function AddMenu({ anchor }: { anchor: { left: number; top: number } }) {
  const setTool = useUiStore((s) => s.setTool);
  const close = () => useUiStore.getState().setAddMenuOpen(false);
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - Math.min(460, window.innerWidth - 16) - 8));
  return (
    <>
      <div className="backdrop" onClick={close} />
      <div className="popover add-menu" style={{ position: 'fixed', left, top: anchor.top }} role="menu" data-testid="add-menu">
        {GROUPS.map((g) => (
          <div key={g.id}>
            <h4>{g.label}</h4>
            <div className="grid">
              {KIND_LIST.filter((k) => k.group === g.id).map((k) => (
                <button
                  key={k.kind}
                  className="btn"
                  role="menuitem"
                  data-testid={`add-${k.kind}`}
                  onClick={() => {
                    useDrawStore.getState().reset();
                    setTool({ type: 'draw', kind: k.kind, shape: k.shapes[0] });
                  }}
                >
                  <span aria-hidden>{k.icon}</span> {k.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
