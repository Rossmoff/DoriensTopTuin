import { create } from 'zustand';
import type { Vec2 } from '../../domain/types';

/** Transient state of the active drawing / measuring tool. */
export interface DrawState {
  points: Vec2[];
  cursor: Vec2 | null;
  pressStart: Vec2 | null;
  measure: { a: Vec2; b: Vec2; done: boolean; dragging: boolean } | null;
  /** Plants placed since the place tool was opened. */
  placedCount: number;
  /** Selection to restore when the place tool is closed (e.g. the bed being planted). */
  returnTo: string | null;
  set: (patch: Partial<Omit<DrawState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

export const useDrawStore = create<DrawState>()((set) => ({
  points: [],
  cursor: null,
  pressStart: null,
  measure: null,
  placedCount: 0,
  returnTo: null,
  set: (patch) => set(patch),
  reset: () => set({ points: [], cursor: null, pressStart: null, measure: null, placedCount: 0, returnTo: null }),
}));
