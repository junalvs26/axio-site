import { describe, it, expect } from 'vitest';
import { cues } from '../src/runtime/cues';
import type { SceneId } from '../src/scenes/types';

const ids: SceneId[] = ['impact', 'awakening', 'city', 'analysis', 'action', 'solution', 'transformation', 'final'];

describe('cues', () => {
  it('olhos apagados no início do despertar e acesos no fim', () => {
    expect(cues('awakening', 0).ignite).toBe(0);
    expect(cues('awakening', 1).ignite).toBe(1);
    expect(cues('awakening', 1).sensor).toBe(1);
  });
  it('impacto acende o laranja depois da queda', () => {
    expect(cues('impact', 0.2).warm).toBe(0);
    expect(cues('impact', 0.6).warm).toBeGreaterThan(0);
  });
  it('transformação é a cena mais clara', () => {
    expect(cues('transformation', 1).glow).toBeGreaterThan(cues('city', 1).glow);
  });
  it('todos os valores ficam entre 0 e 1.5 e são finitos', () => {
    for (const id of ids) for (const l of [0, 0.25, 0.5, 0.75, 1]) {
      for (const v of Object.values(cues(id, l))) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
  });
});

