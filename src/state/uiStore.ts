import { create } from 'zustand';
import type { GeometryType, Id, Month, ObjectKind, Vec2, ZoneKind } from '../domain/types';

export type Tool =
  | { type: 'select' }
  | { type: 'draw'; kind: ObjectKind; shape: GeometryType }
  | { type: 'boundary' }
  | { type: 'zone'; kind: ZoneKind }
  | { type: 'place'; plantId: Id }
  | { type: 'measure' };

export type Theme = 'light' | 'dark' | 'contrast';
export type Dialog = 'plans' | 'new' | 'about' | 'calendars' | 'check' | null;

/** Stage transform: screen = world * scale + (x, y). */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export const BOUNDARY_ID = '__boundary__';

export type Mode = 'edit' | 'walk';

export interface UiState {
  /** 'walk' = read-only garden walk: tap a spot to see its sun, soil and suitable plants. */
  mode: Mode;
  walkPoint: Vec2 | null;
  setMode: (m: Mode) => void;
  setWalkPoint: (p: Vec2 | null) => void;
  tool: Tool;
  /** Month shown by the bloom view (null = off). */
  bloomMonth: Month | null;
  setBloomMonth: (m: Month | null) => void;
  selectedId: Id | null;
  view: View;
  stageSize: { width: number; height: number };
  theme: Theme;
  sheetExpanded: boolean;
  dialog: Dialog;
  addMenuOpen: boolean;
  contextMenu: { screen: Vec2; objectId: Id; openedAt?: number } | null;
  toast: { text: string; at: number } | null;
  setTool: (t: Tool) => void;
  select: (id: Id | null) => void;
  setView: (v: View) => void;
  setStageSize: (s: { width: number; height: number }) => void;
  setTheme: (t: Theme) => void;
  setSheetExpanded: (b: boolean) => void;
  setDialog: (d: Dialog) => void;
  setAddMenuOpen: (b: boolean) => void;
  openContextMenu: (m: UiState['contextMenu']) => void;
  showToast: (text: string) => void;
}

const THEME_KEY = 'tuin.theme';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark' || t === 'contrast') return t;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

export const useUiStore = create<UiState>()((set) => ({
  mode: 'edit',
  walkPoint: null,
  setMode: (mode) => set({ mode, walkPoint: null, selectedId: null, tool: { type: 'select' }, contextMenu: null, addMenuOpen: false }),
  setWalkPoint: (walkPoint) => set({ walkPoint }),
  tool: { type: 'select' },
  bloomMonth: null,
  setBloomMonth: (bloomMonth) => set({ bloomMonth }),
  selectedId: null,
  view: { scale: 20, x: 40, y: 40 },
  stageSize: { width: 800, height: 600 },
  theme: readTheme(),
  sheetExpanded: false,
  dialog: null,
  addMenuOpen: false,
  contextMenu: null,
  toast: null,
  setTool: (tool) => set({ tool, contextMenu: null, addMenuOpen: false, ...(tool.type !== 'select' ? { selectedId: null } : {}) }),
  select: (selectedId) =>
    set((s) => ({ selectedId, contextMenu: s.contextMenu?.objectId === selectedId ? s.contextMenu : null })),
  setView: (view) => set({ view }),
  setStageSize: (stageSize) => set({ stageSize }),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  setSheetExpanded: (sheetExpanded) => set({ sheetExpanded }),
  setDialog: (dialog) => set({ dialog, addMenuOpen: false, contextMenu: null }),
  setAddMenuOpen: (addMenuOpen) => set({ addMenuOpen, contextMenu: null }),
  openContextMenu: (contextMenu) => set({ contextMenu: contextMenu ? { ...contextMenu, openedAt: Date.now() } : null, addMenuOpen: false }),
  showToast: (text) => set({ toast: { text, at: Date.now() } }),
}));

export const uiStore = useUiStore;
