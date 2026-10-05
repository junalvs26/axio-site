import type { Scene } from './types';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Remove cenas desabilitadas e reescala as faixas para cobrir 0–1 de forma contígua. */
export function normalizeRanges(list: Scene[]): Scene[] {
  const active = list.filter((s) => s.enabled);
  const total = active.reduce((sum, s) => sum + (s.range[1] - s.range[0]), 0);
  let cursor = 0;
  return active.map((s, i) => {
    const start = cursor;
    cursor = i === active.length - 1 ? 1 : cursor + (s.range[1] - s.range[0]) / total;
    return { ...s, range: [start, cursor] as [number, number] };
  });
}

/** Cena ativa e progresso local (0–1) dentro dela para um progresso global. */
export function locate(progress: number, list: Scene[]): { scene: Scene; local: number } {
  const p = clamp01(progress);
  const scene = list.find((s) => p < s.range[1]) ?? list[list.length - 1];
  const [a, b] = scene.range;
  return { scene, local: b > a ? clamp01((p - a) / (b - a)) : 1 };
}
