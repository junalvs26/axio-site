export type Tier = 'full' | 'lite' | 'static';

export interface Env { reducedMotion: boolean; saveData: boolean; deviceMemory?: number; effectiveType?: string }

/** full = cinema completo · lite = sem partículas/cursor · static = página editorial. */
export function tier(env: Env): Tier {
  if (env.reducedMotion) return 'static';
  if (env.saveData) return 'lite';
  if (env.deviceMemory !== undefined && env.deviceMemory <= 2) return 'lite';
  if (env.effectiveType && /(^|-)2g|3g/.test(env.effectiveType)) return 'lite';
  return 'full';
}

export function readEnv(): Env {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  return {
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: !!nav.connection?.saveData,
    deviceMemory: nav.deviceMemory,
    effectiveType: nav.connection?.effectiveType,
  };
}
