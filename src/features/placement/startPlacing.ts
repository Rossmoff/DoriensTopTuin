import { uiStore } from '../../state/uiStore';
import { useDrawStore } from '../editor/drawStore';
import { usePlantUi } from '../plants/plantUiStore';

/** Switch to the place tool for a plant and get dialogs/sheets out of the way. */
export function startPlacing(plantId: string) {
  const returnTo = uiStore.getState().selectedId;
  useDrawStore.getState().reset();
  useDrawStore.getState().set({ returnTo });
  usePlantUi.getState().set({ detail: null, libraryOpen: false });
  const ui = uiStore.getState();
  ui.setDialog(null);
  ui.setSheetExpanded(false);
  ui.setTool({ type: 'place', plantId });
}
