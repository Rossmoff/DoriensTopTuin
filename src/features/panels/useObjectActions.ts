import { useMemo } from 'react';
import type { Id } from '../../domain/types';
import { deleteObject, deleteZone, duplicateObject, reorderObject, rotateObject, updateObject } from '../../state/gardenActions';
import { gardenStore } from '../../state/gardenStore';
import { uiStore } from '../../state/uiStore';

/** Shared object commands for the panel, bottom sheet, context menu and keyboard. */
export function objectActions(id: Id | null) {
  const update = gardenStore.getState().update;
  const ok = () => !!id && !!gardenStore.getState().garden?.objects.some((o) => o.id === id);
  return {
    duplicate: () => {
      if (!ok()) return;
      let newId: Id | null = null;
      update((g) => {
        const r = duplicateObject(g, id!);
        newId = r.newId;
        return r.garden;
      });
      if (newId) uiStore.getState().select(newId);
    },
    remove: () => {
      if (id && gardenStore.getState().garden?.zones.some((z) => z.id === id)) {
        update((g) => deleteZone(g, id));
        uiStore.getState().select(null);
        return;
      }
      if (!ok()) return;
      update((g) => deleteObject(g, id!));
      uiStore.getState().select(null);
    },
    rotate: (deg: number) => ok() && update((g) => rotateObject(g, id!, deg)),
    reorder: (where: 'front' | 'back') => ok() && update((g) => reorderObject(g, id!, where)),
    toggleLock: () => {
      if (!ok()) return;
      const o = gardenStore.getState().garden!.objects.find((x) => x.id === id)!;
      update((g) => updateObject(g, id!, { locked: !o.locked }));
    },
    showProperties: () => uiStore.getState().setSheetExpanded(true),
  };
}

export function useObjectActions(id: Id | null) {
  return useMemo(() => objectActions(id), [id]);
}
