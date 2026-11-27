import { create } from 'zustand';
import type { GeometryType, Id, ObjectKind, Vec2 } from '../domain/types';

export type Tool =
  | { type: 'select' }
  | { type: 'draw'; kind: ObjectKind; shape: GeometryType }
  | { type: 'boundary' }
  | { type: 'measure' };

export type Theme = 'light' | 'dark' | 'contrast';
export type Dialog = 'plans' | 'new' | 'about' | null;

/** Stage transform: screen = world * scale + (x, y). */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export const BOUNDARY_ID = '__boundary__';

export interface UiState {
  tool: Tool;
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
  tool: { type: 'select' },
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
