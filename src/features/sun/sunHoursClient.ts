import type { SunHoursInput, SunHoursResult } from '../../domain/sun';

/**
 * Runs sun-hour maps in a Web Worker. Starting a new job terminates a running one,
 * so dragging objects around never queues up stale work.
 */
let worker: Worker | null = null;
let busy = false;
let nextId = 1;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../workers/sunHours.worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function runSunHours(
  input: SunHoursInput,
  onProgress: (fraction: number) => void,
): Promise<SunHoursResult> {
  if (busy && worker) {
    worker.terminate();
    worker = null;
  }
  const w = getWorker();
  const id = nextId++;
  busy = true;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { id: number; type: string; fraction?: number; result?: SunHoursResult; message?: string };
      if (msg.id !== id) return;
      if (msg.type === 'progress') onProgress(msg.fraction ?? 0);
      else {
        w.removeEventListener('message', onMessage);
        busy = false;
        if (msg.type === 'done') resolve(msg.result!);
        else reject(new Error(msg.message));
      }
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', (e) => reject(new Error(e.message)), { once: true });
    w.postMessage({ id, input });
  });
}
