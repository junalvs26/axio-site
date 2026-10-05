import { describe, it, expect } from 'vitest';
import { scenes } from '../src/scenes/config';
import { locate, normalizeRanges } from '../src/scenes/timeline';
import type { Scene } from '../src/scenes/types';

const list = normalizeRanges(scenes);

describe('normalizeRanges', () => {
  it('remove cenas desabilitadas (proof)', () => {
    expect(list.find((s) => s.id === 'proof')).toBeUndefined();
  });
  it('cobre 0–1 sem lacunas', () => {
    expect(list[0].range[0]).toBe(0);
    expect(list[list.length - 1].range[1]).toBeCloseTo(1);
    for (let i = 1; i < list.length; i++) expect(list[i].range[0]).toBeCloseTo(list[i - 1].range[1]);
  });
  it('reescala quando uma cena do meio está desabilitada', () => {
    const custom: Scene[] = [
      { id: 'impact', range: [0, 0.5], enabled: true, media: {} },
      { id: 'proof', range: [0.5, 0.75], enabled: false, media: {} },
      { id: 'final', range: [0.75, 1], enabled: true, media: {} },
    ];
    const r = normalizeRanges(custom);
    expect(r.map((s) => s.range)).toEqual([[0, 2 / 3], [2 / 3, 1]]);
  });
});

describe('locate', () => {
  it('início → impact local 0', () => {
    const { scene, local } = locate(0, list);
    expect(scene.id).toBe('impact');
    expect(local).toBe(0);
  });
  it('0.16 → awakening local 0.5', () => {
    const { scene, local } = locate(0.16, list);
    expect(scene.id).toBe('awakening');
    expect(local).toBeCloseTo(0.5);
  });
  it('1 → final local 1', () => {
    const { scene, local } = locate(1, list);
    expect(scene.id).toBe('final');
    expect(local).toBe(1);
  });
  it('faz clamp fora de 0–1', () => {
    expect(locate(-0.2, list).scene.id).toBe('impact');
    expect(locate(1.3, list)).toMatchObject({ local: 1 });
  });
  it('cena sem mídia não lança', () => {
    expect(() => locate(0.5, list)).not.toThrow();
  });
});
