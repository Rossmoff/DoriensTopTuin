import { create } from 'zustand';
import type { Vec2 } from '../../domain/types';

/** Transient state of the active drawing / measuring tool. */
export interface DrawState {
  points: Vec2[];
  cursor: Vec2 | null;
  pressStart: Vec2 | null;
  measure: { a: Vec2; b: Vec2; done: boolean; dragging: boolean } | null;
  set: (patch: Partial<Omit<DrawState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

export const useDrawStore = create<DrawState>()((set) => ({
  points: [],
  cursor: null,
  pressStart: null,
  measure: null,
  set: (patch) => set(patch),
  reset: () => set({ points: [], cursor: null, pressStart: null, measure: null }),
}));
