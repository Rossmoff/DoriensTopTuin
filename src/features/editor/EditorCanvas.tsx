import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Konva from 'konva';
import { Circle, Group, Layer, Line, Stage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Geometry, Vec2 } from '../../domain/types';
import { bbox, geometryBBox, unionBBox } from '../../domain/geometry';
import { kindInfo } from '../../data/objectCatalog';
import { setBoundary, setGeometry } from '../../state/gardenActions';
import { useGardenStore } from '../../state/gardenStore';
import { BOUNDARY_ID, uiStore, useUiStore } from '../../state/uiStore';
import { useIsCoarsePointer } from '../../ui/useMediaQuery';
import { canvasColors } from './canvasTheme';
import { DrawingPreview } from './DrawingPreview';
import * as drawing from './drawingController';
import { Grid } from './Grid';
import { ObjectLabels } from './ObjectLabels';
import { ObjectShape } from './ObjectShape';
import { ObjectTransformer, VertexHandles } from './SelectionHandles';
import { setStage } from './stageRegistry';
import { fitView, zoomAt } from './viewUtils';
import { isGroundLevel, paintOrder } from './zOrder';
import { ZoneShape } from './ZoneShape';
import { HeatmapLayer, ShadowLayer, SunArc } from '../sun/SunLayers';
import { useSunStore } from '../../state/sunStore';
import { updatePlacement, updateZone } from '../../state/gardenActions';
import { PlacementShape } from '../placement/PlacementLayer';
import { usePlanWarnings } from '../placement/usePlanWarnings';
import { usePlantStore } from '../../state/plantStore';
import type { Vec2 as V2 } from '../../domain/types';

Konva.hitOnDragEnabled = true;
Konva.dragDistance = 4;
// Phones report 2.6–3.5× pixel density; 2× is sharp enough and much cheaper to redraw.
Konva.pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2);

const LONG_PRESS_MS = 550;
const LONG_PRESS_SLOP_PX = 10;

/** Fit the garden (boundary + objects) into the viewport. */
export function fitGardenToView() {
  const g = useGardenStore.getState().garden;
  if (!g) return;
  const boxes = [bbox(g.boundary), ...g.objects.map((o) => geometryBBox(o.geometry))].filter((b) => Number.isFinite(b.minX));
  const box = unionBBox(boxes);
  const ui = uiStore.getState();
  if (!box) return;
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  ui.setView(fitView(box, ui.stageSize, 36, narrow ? 64 : 0));
}

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const garden = useGardenStore((s) => s.garden)!;
  const update = useGardenStore((s) => s.update);
  const tool = useUiStore((s) => s.tool);
  const mode = useUiStore((s) => s.mode);
  const walkPoint = useUiStore((s) => s.walkPoint);
  const selectedId = useUiStore((s) => s.selectedId);
  const view = useUiStore((s) => s.view);
  const stageSize = useUiStore((s) => s.stageSize);
  const theme = useUiStore((s) => s.theme);
  const coarse = useIsCoarsePointer();
  const colors = useMemo(() => canvasColors(theme), [theme]);
  const sunView = useSunStore((s) => s.view);
  const sunResult = useSunStore((s) => s.result);
  const plants = usePlantStore((s) => s.plants);
  const bloomMonth = useUiStore((s) => s.bloomMonth);
  const warnings = usePlanWarnings();
  const plantById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);
  const warnLevel = useMemo(() => {
    const m = new Map<string, 'warn' | 'info'>();
    for (const w of warnings) if (m.get(w.placementId) !== 'warn') m.set(w.placementId, w.severity);
    return m;
  }, [warnings]);

  const dragCancelled = useRef(false);
  const pinch = useRef<{ dist: number; center: Vec2; view: typeof view } | null>(null);
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout>; start: Vec2 } | null>(null);
  /** Tool active when the current press started: a click ending a drawing must not deselect. */
  const toolAtDown = useRef(tool.type);

  // ---- size & initial fit ----
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      uiStore.getState().setStageSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    uiStore.getState().setStageSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const gardenId = garden.id;
  useEffect(() => {
    // Fit once the stage has its real size.
    requestAnimationFrame(fitGardenToView);
  }, [gardenId]);

  useEffect(() => {
    setStage(stageRef.current);
    return () => setStage(null);
  }, []);

  // ---- callbacks for shapes ----
  const onSelect = useCallback((id: string) => {
    const ui = uiStore.getState();
    if (ui.tool.type === 'select' && ui.mode === 'edit') ui.select(id);
  }, []);
  const onMovePlacement = useCallback(
    (id: string, center: V2) => update((g) => updatePlacement(g, id, { center })),
    [update],
  );
  const onGeometry = useCallback(
    (id: string, g: Geometry) => update((gg) => setGeometry(gg, id, g)),
    [update],
  );

  // ---- pointer helpers ----
  const worldPointer = (): Vec2 | null => stageRef.current?.getRelativePointerPosition() ?? null;

  const cancelLongPress = () => {
    if (longPress.current) clearTimeout(longPress.current.timer);
    longPress.current = null;
  };

  const stopAllDrags = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (stage.isDragging()) stage.stopDrag();
    stage.find((n: Konva.Node) => n.isDragging()).forEach((n) => {
      dragCancelled.current = true;
      n.stopDrag();
    });
  };

  const objIdOf = (target: Konva.Node): string | undefined =>
    target.getAttr('objId') ?? target.getParent()?.getAttr('objId');

  // ---- touch: pinch zoom / two-finger pan ----
  const onTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const t = e.evt.touches;
    if (t.length >= 2) {
      e.evt.preventDefault();
      cancelLongPress();
      drawing.abortPress();
      stopAllDrags();
      const a = { x: t[0].clientX, y: t[0].clientY };
      const b = { x: t[1].clientX, y: t[1].clientY };
      const rect = containerRef.current!.getBoundingClientRect();
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        center: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
        view: uiStore.getState().view,
      };
    }
  };
  const onTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const t = e.evt.touches;
    const p = pinch.current;
    if (t.length < 2 || !p) return;
    e.evt.preventDefault();
    stopAllDrags();
    const rect = containerRef.current!.getBoundingClientRect();
    const a = { x: t[0].clientX, y: t[0].clientY };
    const b = { x: t[1].clientX, y: t[1].clientY };
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const center = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
    const zoomed = zoomAt(p.view, p.center, dist / p.dist);
    uiStore.getState().setView({ ...zoomed, x: zoomed.x + center.x - p.center.x, y: zoomed.y + center.y - p.center.y });
  };
  const onTouchEnd = (e: KonvaEventObject<TouchEvent>) => {
    if (e.evt.touches.length < 2) pinch.current = null;
    if (e.evt.touches.length === 0) setTimeout(() => (dragCancelled.current = false), 0);
  };

  // ---- wheel zoom ----
  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pt = stage?.getPointerPosition();
    if (!pt) return;
    const k = e.evt.ctrlKey ? 0.01 : 0.0015;
    uiStore.getState().setView(zoomAt(uiStore.getState().view, pt, Math.exp(-e.evt.deltaY * k)));
  };

  // ---- pointer: drawing tools + long-press ----
  const onPointerDown = (e: KonvaEventObject<PointerEvent>) => {
    toolAtDown.current = uiStore.getState().tool.type;
    if (pinch.current) return;
    if (e.evt.button === 2) return;
    const p = worldPointer();
    if (!p) return;
    if (tool.type === 'select') {
      if (uiStore.getState().mode === 'walk') return;
      const id = objIdOf(e.target);
      if (!id) return;
      const start = { x: e.evt.clientX, y: e.evt.clientY };
      cancelLongPress();
      longPress.current = {
        start,
        timer: setTimeout(() => {
          longPress.current = null;
          stopAllDrags();
          uiStore.getState().select(id);
          uiStore.getState().openContextMenu({ screen: start, objectId: id });
          setTimeout(() => (dragCancelled.current = false), 0);
        }, LONG_PRESS_MS),
      };
      return;
    }
    drawing.pointerDown(p);
  };
  const onPointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (longPress.current) {
      const s = longPress.current.start;
      if (Math.hypot(e.evt.clientX - s.x, e.evt.clientY - s.y) > LONG_PRESS_SLOP_PX) cancelLongPress();
    }
    if (pinch.current || tool.type === 'select') return;
    const p = worldPointer();
    if (p) drawing.pointerMove(p);
  };
  const onPointerUp = () => {
    cancelLongPress();
    if (pinch.current || tool.type === 'select') return;
    const p = worldPointer();
    if (p) drawing.pointerUp(p);
  };

  const onStageTap = (e: KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>) => {
    const fromSelect = toolAtDown.current === 'select' && uiStore.getState().tool.type === 'select';
    if (uiStore.getState().mode === 'walk') {
      const p = worldPointer();
      if (p) {
        uiStore.getState().setWalkPoint(p);
        uiStore.getState().setSheetExpanded(true);
        if (useSunStore.getState().view !== 'off') useSunStore.getState().set({ probe: p });
      }
      return;
    }
    if (fromSelect && e.target === stageRef.current) uiStore.getState().select(null);
    // In sun views, a tap anywhere shows the sun info for that spot.
    if (fromSelect && useSunStore.getState().view !== 'off') {
      const p = worldPointer();
      if (p) useSunStore.getState().set({ probe: p });
    }
  };

  const onContextMenu = (e: KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    const id = objIdOf(e.target);
    if (!id || tool.type !== 'select' || uiStore.getState().mode === 'walk') return;
    uiStore.getState().select(id);
    uiStore.getState().openContextMenu({ screen: { x: e.evt.clientX, y: e.evt.clientY }, objectId: id });
  };

  const onStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return;
    uiStore.getState().setView({ scale: view.scale, x: stage.x(), y: stage.y() });
  };

  // ---- derived ----
  const hidden = new Set(garden.settings.hiddenGroups);
  const visible = paintOrder(garden.objects.filter((o) => !hidden.has(kindInfo(o.kind).group)));
  const ground = visible.filter(isGroundLevel);
  const raised = visible.filter((o) => !isGroundLevel(o));
  const selected = garden.objects.find((o) => o.id === selectedId);
  const selectedZone = garden.zones.find((z) => z.id === selectedId);
  const showZones = !hidden.has('zones');
  const snapStep = garden.settings.snap ? garden.settings.gridSizeM : 0;
  const boundaryFlat = garden.boundary.flatMap((p) => [p.x, p.y]);
  const isSelect = tool.type === 'select';
  const editable = isSelect && mode === 'edit';

  return (
    <div
      ref={containerRef}
      className="canvas-wrap"
      data-testid="canvas"
      style={{ background: colors.background, cursor: isSelect ? 'default' : 'crosshair' }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={view.scale}
        scaleY={view.scale}
        x={view.x}
        y={view.y}
        draggable={isSelect}
        onDragEnd={onStageDragEnd}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onStageTap}
        onTap={onStageTap}
        onContextMenu={onContextMenu}
      >
        <Layer listening={false}>
          <Line points={boundaryFlat} closed fill={colors.plot} />
          <Grid step={garden.settings.gridSizeM} color={colors.grid} majorColor={colors.gridMajor} />
        </Layer>
        <Layer listening={isSelect}>
          <Line
            points={boundaryFlat}
            closed
            fillEnabled={false}
            stroke={selectedId === BOUNDARY_ID ? colors.select : colors.plotStroke}
            strokeWidth={selectedId === BOUNDARY_ID ? 4 : 2.5}
            strokeScaleEnabled={false}
            hitStrokeWidth={coarse ? 24 : 12}
            dash={[10, 4]}
            onClick={() => editable && uiStore.getState().select(BOUNDARY_ID)}
            onTap={() => editable && uiStore.getState().select(BOUNDARY_ID)}
          />
          {ground.map((o) => (
            <ObjectShape
              key={o.id}
              obj={o}
              selected={o.id === selectedId}
              scale={view.scale}
              colors={colors}
              draggable={editable && (!coarse || o.id === selectedId)}
              snapStep={snapStep}
              dragCancelled={dragCancelled}
              onSelect={onSelect}
              onGeometry={onGeometry}
            />
          ))}
          {!hidden.has('plants') &&
            garden.placements.map((pl) => (
              <PlacementShape
                key={pl.id}
                placement={pl}
                plant={plantById.get(pl.plantId)}
                selected={pl.id === selectedId}
                scale={view.scale}
                colors={colors}
                draggable={editable && (!coarse || pl.id === selectedId)}
                snapStep={snapStep}
                warning={warnLevel.get(pl.id) ?? null}
                month={bloomMonth}
                dragCancelled={dragCancelled}
                onSelect={onSelect}
                onMove={onMovePlacement}
              />
            ))}
        </Layer>
        {/* Separate canvas so animating the sun only redraws the shadows, not every object. */}
        <Layer listening={false}>
          {sunView === 'hours' && sunResult && <HeatmapLayer result={sunResult} opacity={theme === 'contrast' ? 0.85 : 0.7} />}
          {sunView === 'shadows' && <ShadowLayer garden={garden} dark={theme === 'dark'} />}
        </Layer>
        <Layer listening={isSelect}>
          {raised.map((o) => (
            <ObjectShape
              key={o.id}
              obj={o}
              selected={o.id === selectedId}
              scale={view.scale}
              colors={colors}
              draggable={editable && (!coarse || o.id === selectedId)}
              snapStep={snapStep}
              dragCancelled={dragCancelled}
              onSelect={onSelect}
              onGeometry={onGeometry}
            />
          ))}
          {showZones &&
            garden.zones.map((z) => (
              <ZoneShape key={z.id} zone={z} selected={z.id === selectedId} scale={view.scale} colors={colors} onSelect={onSelect} />
            ))}
          <ObjectLabels objects={visible} scale={view.scale} colors={colors} />
        </Layer>
        <Layer>
          {editable && selected && <ObjectTransformer obj={selected} coarse={coarse} colors={colors} scale={view.scale} />}
          {editable && selected && !selected.locked && (selected.geometry.type === 'polygon' || selected.geometry.type === 'polyline') && (
            <VertexHandles
              points={selected.geometry.points}
              closed={selected.geometry.type === 'polygon'}
              minPoints={selected.geometry.type === 'polygon' ? 3 : 2}
              scale={view.scale}
              coarse={coarse}
              snapStep={snapStep}
              colors={colors}
              onChange={(points, final) => {
                const geo = selected.geometry as Extract<Geometry, { type: 'polygon' | 'polyline' }>;
                update((g) => setGeometry(g, selected.id, { ...geo, points }), final ? undefined : { coalesceKey: `${selected.id}.vertices` });
              }}
            />
          )}
          {editable && selectedId === BOUNDARY_ID && (
            <VertexHandles
              points={garden.boundary}
              closed
              minPoints={3}
              scale={view.scale}
              coarse={coarse}
              snapStep={snapStep}
              colors={colors}
              onChange={(points, final) => update((g) => setBoundary(g, points), final ? undefined : { coalesceKey: 'boundary.vertices' })}
            />
          )}
          {editable && selectedZone && (
            <VertexHandles
              points={selectedZone.points}
              closed
              minPoints={3}
              scale={view.scale}
              coarse={coarse}
              snapStep={snapStep}
              colors={colors}
              onChange={(points, final) => update((g) => updateZone(g, selectedZone.id, { points }), final ? undefined : { coalesceKey: `${selectedZone.id}.vertices` })}
            />
          )}
          {sunView === 'shadows' && <SunArc garden={garden} scale={view.scale} textColor={colors.text} />}
          <DrawingPreview tool={tool} scale={view.scale} colors={colors} />
          {mode === 'walk' && walkPoint && (
            <Group x={walkPoint.x} y={walkPoint.y} listening={false}>
              <Circle radius={14 / view.scale} fill={colors.select} opacity={0.25} />
              <Circle radius={6 / view.scale} fill={colors.select} stroke="#fff" strokeWidth={2} strokeScaleEnabled={false} />
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
