import type { Garden } from '../domain/types';
import { IndexedDbGardenRepository, MemoryGardenRepository, type GardenRepository } from '../storage';
import { gardenStore } from './gardenStore';

let repo: GardenRepository | null = null;

export function getRepository(): GardenRepository {
  if (!repo) {
    repo = typeof indexedDB !== 'undefined' ? new IndexedDbGardenRepository() : new MemoryGardenRepository();
  }
  return repo;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: Garden | null = null;

async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  const g = pending;
  pending = null;
  if (g) await getRepository().save(g);
}

/** Debounced autosave of the open garden. Call once at startup. Returns an unsubscribe function. */
export function startAutosave(delayMs = 400): () => void {
  const unsub = gardenStore.subscribe((state, prev) => {
    if (!state.garden || state.garden === prev.garden) return;
    // Opening a different plan is not an edit.
    if (prev.garden?.id !== state.garden.id) return;
    pending = state.garden;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), delayMs);
  });
  const onHide = () => void flush();
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    unsub();
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}

export const flushAutosave = flush;

/** Open a garden: load into the store and remember it as last opened. */
export async function openGarden(g: Garden) {
  await flush();
  gardenStore.getState().load(g);
  await getRepository().setLastOpenedId(g.id);
}

/** Save immediately (used for new/imported plans). */
export async function saveNow(g: Garden) {
  await getRepository().save(g);
}
