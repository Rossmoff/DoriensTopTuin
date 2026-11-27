import { useEffect, useState } from 'react';
import { EditorCanvas } from './features/editor/EditorCanvas';
import { ContextMenu } from './features/editor/ContextMenu';
import { DrawHint } from './features/editor/DrawHint';
import { Compass, ScaleBar, ZoomControls } from './features/editor/Overlays';
import { BottomSheet } from './features/panels/BottomSheet';
import { PropertiesPanel } from './features/panels/PropertiesPanel';
import { AboutDialog } from './features/plans/AboutDialog';
import { NewGardenDialog } from './features/plans/NewGardenDialog';
import { PlansDialog } from './features/plans/PlansDialog';
import { TopBar } from './features/toolbar/TopBar';
import { useGardenStore } from './state/gardenStore';
import { getRepository, openGarden, startAutosave } from './state/persistence';
import { useUiStore } from './state/uiStore';
import { useIsNarrow } from './ui/useMediaQuery';
import { useKeyboard } from './useKeyboard';
import { SunBar } from './features/sun/SunBar';
import { SunProbe } from './features/sun/SunProbe';
import { useSeasonSunMap, useSunHoursJob } from './features/sun/useSunHoursJob';
import { isPlantingKind } from './data/objectCatalog';
import { useSunStore } from './state/sunStore';
import { usePlantStore } from './state/plantStore';
import { WalkPanel } from './features/walk/WalkPanel';
import { PlantDetailDialog } from './features/plants/PlantDetailDialog';
import { PlantEditorDialog } from './features/plants/PlantEditorDialog';
import { PlantLibraryDialog } from './features/plants/PlantLibraryDialog';
import { BloomBar } from './features/calendars/BloomBar';
import { CalendarsDialog } from './features/calendars/CalendarsDialog';
import { PlanCheckDialog } from './features/placement/PlanCheckDialog';

function Toast() {
  const toast = useUiStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return visible && toast ? (
    <div className="toast" role="status">
      {toast.text}
    </div>
  ) : null;
}

/** Open the last-used plan, or ask for a new one on first start. */
async function boot() {
  const repo = getRepository();
  const lastId = await repo.getLastOpenedId();
  let g = lastId ? await repo.get(lastId) : undefined;
  if (!g) {
    const first = (await repo.list())[0];
    if (first) g = await repo.get(first.id);
  }
  if (g) await openGarden(g);
  else useUiStore.getState().setDialog('new');
}

export function App() {
  const garden = useGardenStore((s) => s.garden);
  const theme = useUiStore((s) => s.theme);
  const tool = useUiStore((s) => s.tool);
  const dialog = useUiStore((s) => s.dialog);
  const narrow = useIsNarrow();
  const [ready, setReady] = useState(false);
  const sunView = useSunStore((s) => s.view);
  const mode = useUiStore((s) => s.mode);
  const bloomMonth = useUiStore((s) => s.bloomMonth);
  useKeyboard();
  useSunHoursJob();
  const selectedId = useUiStore((s) => s.selectedId);
  const needsSeason = useGardenStore((s) => {
    const g = s.garden;
    if (!g) return false;
    if (g.placements.length > 0) return true;
    const sel = g.objects.find((o) => o.id === selectedId);
    return !!sel && isPlantingKind(sel.kind);
  });
  useSeasonSunMap(needsSeason || mode === 'walk');

  useEffect(() => {
    const stop = startAutosave();
    void usePlantStore.getState().load().catch(() => undefined);
    boot()
      .catch((e) => {
        console.error(e);
        useUiStore.getState().showToast('Could not open saved plans on this device.');
        useUiStore.getState().setDialog('new');
      })
      .finally(() => setReady(true));
    return stop;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="app" data-theme={theme}>
      <TopBar />
      <main className={`main ${narrow ? 'with-sheet' : ''} ${tool.type !== 'select' ? 'with-hint' : ''} ${sunView !== 'off' || bloomMonth !== null ? 'with-sunbar' : ''}`}>
        {garden && (
          <>
            <div className="canvas-area">
              <EditorCanvas />
              <DrawHint />
              <Compass />
              <ScaleBar />
              <ZoomControls />
              {sunView !== 'off' && tool.type === 'select' && <SunProbe />}
              {sunView !== 'off' && <SunBar />}
              {bloomMonth !== null && sunView === 'off' && <BloomBar />}
            </div>
            {narrow ? (
              <BottomSheet>{mode === 'walk' ? <WalkPanel /> : <PropertiesPanel />}</BottomSheet>
            ) : (
              <aside className="side-panel" aria-label="Properties">
                {mode === 'walk' ? <WalkPanel /> : <PropertiesPanel />}
              </aside>
            )}
          </>
        )}
        {!garden && ready && dialog !== 'new' && (
          <div style={{ margin: 'auto' }}>
            <button className="btn primary" onClick={() => useUiStore.getState().setDialog('new')}>
              Create a garden plan
            </button>
          </div>
        )}
      </main>
      {dialog === 'plans' && <PlansDialog />}
      {dialog === 'new' && <NewGardenDialog />}
      {dialog === 'about' && <AboutDialog />}
      {dialog === 'calendars' && <CalendarsDialog />}
      {dialog === 'check' && <PlanCheckDialog />}
      <ContextMenu />
      <PlantLibraryDialog />
      <PlantDetailDialog />
      <PlantEditorDialog />
      <Toast />
    </div>
  );
}
