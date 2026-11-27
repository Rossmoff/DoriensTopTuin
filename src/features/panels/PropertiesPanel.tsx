import { useGardenStore } from '../../state/gardenStore';
import { BOUNDARY_ID, useUiStore } from '../../state/uiStore';
import { BoundaryProperties, GardenProperties } from './GardenProperties';
import { ObjectProperties } from './ObjectProperties';
import { ZoneProperties } from './ZoneProperties';
import { PlacementProperties } from '../placement/PlacementProperties';

export function PropertiesPanel() {
  const selectedId = useUiStore((s) => s.selectedId);
  const obj = useGardenStore((s) => s.garden?.objects.find((o) => o.id === selectedId));
  const zone = useGardenStore((s) => s.garden?.zones.find((z) => z.id === selectedId));
  const placement = useGardenStore((s) => s.garden?.placements.find((p) => p.id === selectedId));
  if (selectedId === BOUNDARY_ID) return <BoundaryProperties />;
  if (obj) return <ObjectProperties obj={obj} />;
  if (zone) return <ZoneProperties zone={zone} />;
  if (placement) return <PlacementProperties placement={placement} />;
  return <GardenProperties />;
}
