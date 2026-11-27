/// <reference lib="webworker" />
import { computeSunHours, type SunHoursInput } from '../domain/sun/sunHours';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<{ id: number; input: SunHoursInput }>) => {
  const { id, input } = e.data;
  try {
    let last = 0;
    const result = computeSunHours(input, (f) => {
      const now = performance.now();
      if (now - last > 100 || f === 1) {
        last = now;
        ctx.postMessage({ id, type: 'progress', fraction: f });
      }
    });
    ctx.postMessage({ id, type: 'done', result }, [result.hours.buffer]);
  } catch (err) {
    ctx.postMessage({ id, type: 'error', message: (err as Error).message });
  }
};
