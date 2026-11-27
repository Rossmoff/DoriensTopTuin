import { useGardenStore } from '../../state/gardenStore';
import { BOUNDARY_ID, useUiStore } from '../../state/uiStore';
import { BoundaryProperties, GardenProperties } from './GardenProperties';
import { ObjectProperties } from './ObjectProperties';

export function PropertiesPanel() {
  const selectedId = useUiStore((s) => s.selectedId);
  const obj = useGardenStore((s) => s.garden?.objects.find((o) => o.id === selectedId));
  if (selectedId === BOUNDARY_ID) return <BoundaryProperties />;
  if (obj) return <ObjectProperties obj={obj} />;
  return <GardenProperties />;
}
