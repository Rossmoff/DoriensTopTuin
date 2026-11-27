import { useEffect } from 'react';
import { translateGeometry } from './domain/geometry';
import { setGeometry } from './state/gardenActions';
import { gardenStore } from './state/gardenStore';
import { uiStore } from './state/uiStore';
import * as drawing from './features/editor/drawingController';
import { objectActions } from './features/panels/useObjectActions';

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const ui = uiStore.getState();
      const gs = gardenStore.getState();
      const sel = ui.selectedId;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) gs.redo();
        else gs.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        gs.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        objectActions(sel).duplicate();
        return;
      }
      if (e.key === 'Escape') {
        if (ui.tool.type !== 'select') drawing.cancel();
        else ui.select(null);
        ui.setAddMenuOpen(false);
        ui.openContextMenu(null);
        return;
      }
      if (e.key === 'Enter' && ui.tool.type !== 'select') {
        drawing.finish();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault();
        objectActions(sel).remove();
        return;
      }
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (arrows[e.key] && sel && gs.garden) {
        const obj = gs.garden.objects.find((o) => o.id === sel);
        if (!obj || obj.locked) return;
        e.preventDefault();
        const step = e.shiftKey ? 1 : gs.garden.settings.gridSizeM;
        const [dx, dy] = arrows[e.key];
        gs.update((g) => setGeometry(g, sel, translateGeometry(obj.geometry, { x: dx * step, y: dy * step })), { coalesceKey: `${sel}.nudge` });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
