import type { SunHoursInput, SunHoursResult } from '../../domain/sun';

/**
 * Runs sun-hour maps in Web Workers, one worker per channel ("display" for the visible map,
 * "season" for plant matching). Starting a new job on a channel terminates the running one,
 * so dragging objects around never queues up stale work.
 */
interface Channel {
  worker: Worker | null;
  busy: boolean;
}
const channels = new Map<string, Channel>();
let nextId = 1;

function channel(name: string): Channel {
  let c = channels.get(name);
  if (!c) {
    c = { worker: null, busy: false };
    channels.set(name, c);
  }
  return c;
}

export function runSunHours(
  input: SunHoursInput,
  onProgress: (fraction: number) => void,
  channelName = 'display',
): Promise<SunHoursResult> {
  const ch = channel(channelName);
  if (ch.busy && ch.worker) {
    ch.worker.terminate();
    ch.worker = null;
  }
  const w = (ch.worker ??= new Worker(new URL('../../workers/sunHours.worker.ts', import.meta.url), { type: 'module' }));
  const id = nextId++;
  ch.busy = true;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { id: number; type: string; fraction?: number; result?: SunHoursResult; message?: string };
      if (msg.id !== id) return;
      if (msg.type === 'progress') onProgress(msg.fraction ?? 0);
      else {
        w.removeEventListener('message', onMessage);
        ch.busy = false;
        if (msg.type === 'done') resolve(msg.result!);
        else reject(new Error(msg.message));
      }
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', (e) => reject(new Error(e.message)), { once: true });
    w.postMessage({ id, input });
  });
}
