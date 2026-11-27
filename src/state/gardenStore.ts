import { create } from 'zustand';
import type { Garden } from '../domain/types';

const MAX_HISTORY = 100;
/** Edits with the same coalesce key within this window merge into one undo step. */
const COALESCE_MS = 1200;

export interface GardenState {
  garden: Garden | null;
  past: Garden[];
  future: Garden[];
  lastEdit: { key: string; at: number } | null;
  /** Replace the current garden (open/new/import). Clears history. */
  load: (g: Garden | null) => void;
  /** Apply an edit as one undoable step. */
  update: (fn: (g: Garden) => Garden, opts?: { coalesceKey?: string }) => void;
  undo: () => void;
  redo: () => void;
}

export const useGardenStore = create<GardenState>()((set, get) => ({
  garden: null,
  past: [],
  future: [],
  lastEdit: null,

  load: (g) => set({ garden: g, past: [], future: [], lastEdit: null }),

  update: (fn, opts) => {
    const { garden, past, lastEdit } = get();
    if (!garden) return;
    const next = fn(garden);
    if (next === garden) return;
    const now = Date.now();
    const coalesce =
      !!opts?.coalesceKey && lastEdit?.key === opts.coalesceKey && now - lastEdit.at < COALESCE_MS && past.length > 0;
    set({
      garden: { ...next, updatedAt: new Date(now).toISOString() },
      past: coalesce ? past : [...past, garden].slice(-MAX_HISTORY),
      future: [],
      lastEdit: opts?.coalesceKey ? { key: opts.coalesceKey, at: now } : null,
    });
  },

  undo: () => {
    const { garden, past, future } = get();
    if (!garden || past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      garden: { ...prev, updatedAt: new Date().toISOString() },
      past: past.slice(0, -1),
      future: [garden, ...future],
      lastEdit: null,
    });
  },

  redo: () => {
    const { garden, past, future } = get();
    if (!garden || future.length === 0) return;
    const [next, ...rest] = future;
    set({
      garden: { ...next, updatedAt: new Date().toISOString() },
      past: [...past, garden],
      future: rest,
      lastEdit: null,
    });
  },
}));

/** Non-hook accessor for event handlers. */
export const gardenStore = useGardenStore;
