import { create } from 'zustand';
import type { Plant } from '../../domain/types';
import type { Suitability } from '../../domain/plants';

export interface PlantUiState {
  /** Plant shown in the detail dialog, with its suitability for the current spot if known. */
  detail: { id: string; suitability?: Suitability } | null;
  /** Draft being edited (new or existing plant). */
  editing: Plant | null;
  libraryOpen: boolean;
  set: (patch: Partial<Omit<PlantUiState, 'set'>>) => void;
}

export const usePlantUi = create<PlantUiState>()((set) => ({
  detail: null,
  editing: null,
  libraryOpen: false,
  set: (patch) => set(patch),
}));
