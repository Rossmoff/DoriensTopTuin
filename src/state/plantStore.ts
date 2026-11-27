import { create } from 'zustand';
import type { Plant } from '../domain/types';
import { BUILTIN_PLANTS } from '../data/plants';
import { EMPTY_FILTER, type PlantFilter } from '../domain/plants';
import { LocalPlantSource } from '../plantSource/LocalPlantSource';
import type { PlantSource } from '../plantSource/PlantSource';

let source: PlantSource | null = null;
export const getPlantSource = (): PlantSource => (source ??= new LocalPlantSource());

export interface PlantState {
  plants: Plant[];
  filter: PlantFilter;
  setFilter: (patch: Partial<PlantFilter>) => void;
  resetFilter: () => void;
  load: () => Promise<void>;
  save: (p: Plant) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const usePlantStore = create<PlantState>()((set, get) => ({
  plants: BUILTIN_PLANTS,
  filter: EMPTY_FILTER,
  setFilter: (patch) => set({ filter: { ...get().filter, ...patch } }),
  resetFilter: () => set({ filter: EMPTY_FILTER }),
  load: async () => set({ plants: await getPlantSource().all() }),
  save: async (p) => {
    await getPlantSource().upsert(p);
    await get().load();
  },
  remove: async (id) => {
    await getPlantSource().remove(id);
    await get().load();
  },
}));
