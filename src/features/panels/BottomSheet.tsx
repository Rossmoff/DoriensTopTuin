import type { ReactNode } from 'react';
import { kindInfo } from '../../data/objectCatalog';
import { useGardenStore } from '../../state/gardenStore';
import { BOUNDARY_ID, useUiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { useObjectActions } from './useObjectActions';
import { ZONE_STYLE } from '../editor/ZoneShape';

/** Mobile container for the properties panel: a header with quick actions that expands upward. */
export function BottomSheet({ children }: { children: ReactNode }) {
  const expanded = useUiStore((s) => s.sheetExpanded);
  const setExpanded = useUiStore((s) => s.setSheetExpanded);
  const selectedId = useUiStore((s) => s.selectedId);
  const select = useUiStore((s) => s.select);
  const obj = useGardenStore((s) => s.garden?.objects.find((o) => o.id === selectedId));
  const gardenName = useGardenStore((s) => s.garden?.name ?? '');
  const zone = useGardenStore((s) => s.garden?.zones.find((z) => z.id === selectedId));
  const actions = useObjectActions(obj?.id ?? null);

  const title = obj
    ? `${kindInfo(obj.kind).icon} ${obj.label}`
    : zone
      ? `${ZONE_STYLE[zone.kind].label} zone`
      : selectedId === BOUNDARY_ID
      ? 'Plot boundary'
      : `${gardenName} · settings`;

  return (
    <section className={`sheet ${expanded ? 'expanded' : 'collapsed'}`} data-testid="bottom-sheet" aria-label="Properties">
      <div className="sheet-header">
        <button className="btn grab" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} data-testid="sheet-toggle">
          <Icon name={expanded ? 'chevronDown' : 'chevronUp'} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        </button>
        {obj && (
          <>
            <button className="btn icon" onClick={actions.duplicate} aria-label="Duplicate">
              <Icon name="copy" />
            </button>
            {obj.geometry.type !== 'circle' && (
              <button className="btn icon" onClick={() => actions.rotate(90)} aria-label="Rotate 90°">
                <Icon name="rotate" />
              </button>
            )}
            <button className="btn icon danger" onClick={actions.remove} aria-label="Delete">
              <Icon name="trash" />
            </button>
          </>
        )}
        {selectedId && (
          <button className="btn icon" onClick={() => select(null)} aria-label="Deselect">
            <Icon name="close" />
          </button>
        )}
      </div>
      <div className="sheet-body">{children}</div>
    </section>
  );
}
