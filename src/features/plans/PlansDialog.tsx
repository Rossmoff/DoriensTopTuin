import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import type { GardenSummary } from '../../domain/types';
import { getRepository, openGarden, saveNow } from '../../state/persistence';
import { useGardenStore } from '../../state/gardenStore';
import { useUiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { importJsonFile, pickFile } from './fileActions';

export function PlansDialog() {
  const setDialog = useUiStore((s) => s.setDialog);
  const showToast = useUiStore((s) => s.showToast);
  const current = useGardenStore((s) => s.garden);
  const [plans, setPlans] = useState<GardenSummary[]>([]);
  const refresh = () => getRepository().list().then(setPlans);

  useEffect(() => {
    void refresh();
  }, [current?.id, current?.name]);

  const open = async (id: string) => {
    const g = await getRepository().get(id);
    if (g) {
      await openGarden(g);
      useUiStore.getState().select(null);
      setDialog(null);
    }
  };

  const duplicate = async (id: string) => {
    const g = await getRepository().get(id);
    if (!g) return;
    const now = new Date().toISOString();
    await saveNow({ ...g, id: nanoid(12), name: `${g.name} (copy)`, createdAt: now, updatedAt: now });
    await refresh();
  };

  const rename = async (id: string) => {
    const g = await getRepository().get(id);
    if (!g) return;
    const name = window.prompt('New name for this plan', g.name)?.trim();
    if (!name) return;
    if (current?.id === id) useGardenStore.getState().update((gg) => ({ ...gg, name }));
    else await saveNow({ ...g, name, updatedAt: new Date().toISOString() });
    await refresh();
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    await getRepository().delete(id);
    if (current?.id === id) {
      const rest = (await getRepository().list())[0];
      if (rest) await openGarden((await getRepository().get(rest.id))!);
      else {
        useGardenStore.getState().load(null);
        setDialog('new');
        return;
      }
    }
    await refresh();
  };

  return (
    <div className="dialog-backdrop" onClick={() => setDialog(null)}>
      <div className="dialog" role="dialog" aria-label="Plans" onClick={(e) => e.stopPropagation()} data-testid="plans-dialog">
        <h2>Your plans</h2>
        {plans.map((p) => (
          <div key={p.id} className="plan-row">
            <button className="btn open" onClick={() => open(p.id)}>
              <strong>
                {p.name}
                {p.id === current?.id ? ' (open)' : ''}
              </strong>
              <small>
                {p.objectCount} objects · edited {new Date(p.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </small>
            </button>
            <button className="btn icon" onClick={() => rename(p.id)} aria-label={`Rename ${p.name}`} title="Rename">
              ✎
            </button>
            <button className="btn icon" onClick={() => duplicate(p.id)} aria-label={`Duplicate ${p.name}`} title="Duplicate">
              <Icon name="copy" />
            </button>
            <button className="btn icon danger" onClick={() => remove(p.id, p.name)} aria-label={`Delete ${p.name}`} title="Delete">
              <Icon name="trash" />
            </button>
          </div>
        ))}
        <div className="actions">
          <button className="btn primary" onClick={() => setDialog('new')}>
            <Icon name="plus" /> New plan
          </button>
          <button
            className="btn"
            onClick={async () => {
              const f = await pickFile('.json,application/json');
              if (!f) return;
              try {
                await importJsonFile(f);
                setDialog(null);
              } catch (e) {
                showToast((e as Error).message);
              }
            }}
          >
            <Icon name="upload" /> Import JSON…
          </button>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="btn" onClick={() => setDialog(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
