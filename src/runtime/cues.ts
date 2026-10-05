import type { SceneId } from '../scenes/types';

export interface Cues {
  visor: number; ignite: number; sensor: number; visorScale: number;
  warm: number; glow: number; zoom: number; rain: number;
}

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
/** 0→1 suave entre a e b. */
const ramp = (x: number, a: number, b: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const BASE: Cues = { visor: 0, ignite: 0, sensor: 0, visorScale: 1, warm: 0, glow: 0, zoom: 0, rain: 0.6 };

/** Direção de luz/câmera do palco para cada cena e progresso local. */
export function cues(id: SceneId, l: number): Cues {
  switch (id) {
    case 'impact': {
      const hit = l < 0.55 ? 0 : 1 - ramp(l, 0.6, 1) * 0.6;
      return { ...BASE, warm: hit * 0.9, zoom: ramp(l, 0, 0.55) * 0.6, rain: 0.5 + ramp(l, 0.55, 0.6) * 0.5 };
    }
    case 'awakening':
      return {
        ...BASE, visor: ramp(l, 0, 0.3), ignite: ramp(l, 0.3, 0.6), sensor: l >= 0.62 ? 1 : 0,
        visorScale: 1.35 - ramp(l, 0, 0.7) * 0.35, warm: ramp(l, 0.3, 0.6) * 0.3, rain: 0.4,
      };
    case 'city':
      return { ...BASE, visor: 1 - ramp(l, 0, 0.35), ignite: 1, sensor: 1 - ramp(l, 0, 0.35), visorScale: 1 - ramp(l, 0, 0.35) * 0.3, glow: 0.2, rain: 1 };
    case 'analysis':
      return { ...BASE, warm: 0.12, glow: 0.15, rain: 0.5, zoom: ramp(l, 0, 1) * 0.4 };
    case 'action':
      return { ...BASE, warm: 0.08, glow: 0.25, rain: 0.8, zoom: l * 0.5 };
    case 'solution':
      return { ...BASE, warm: 0.35 + ramp(l, 0, 0.5) * 0.3, glow: 0.3, rain: 0.3 };
    case 'transformation':
      return { ...BASE, warm: 0.25, glow: 0.5 + ramp(l, 0, 1) * 0.5, rain: 0.25 - ramp(l, 0, 1) * 0.2 };
    case 'final':
      return {
        ...BASE, visor: ramp(l, 0.05, 0.35), ignite: ramp(l, 0.15, 0.45), sensor: l >= 0.4 ? 1 : 0,
        visorScale: 0.72 + ramp(l, 0, 1) * 0.2, warm: 0.3 + ramp(l, 0.2, 0.6) * 0.3, glow: 0.4, rain: 0.2,
      };
    default:
      return BASE;
  }
}
