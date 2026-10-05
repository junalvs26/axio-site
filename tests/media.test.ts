import { describe, it, expect } from 'vitest';
import { pickSource } from '../src/runtime/media';
import type { Scene } from '../src/scenes/types';

const sc = (media: Scene['media']): Scene => ({ id: 'city', range: [0, 1], enabled: true, media });
const portrait = { w: 390, h: 844 };
const landscape = { w: 1440, h: 900 };

describe('pickSource', () => {
  it('retrato com mobile → mobile', () => {
    expect(pickSource(sc({ desktop: '/d.mp4', mobile: '/m.mp4' }), portrait)).toBe('/m.mp4');
  });
  it('retrato sem mobile → desktop', () => {
    expect(pickSource(sc({ desktop: '/d.mp4' }), portrait)).toBe('/d.mp4');
  });
  it('paisagem sem desktop → mobile', () => {
    expect(pickSource(sc({ mobile: '/m.mp4' }), landscape)).toBe('/m.mp4');
  });
  it('sem mídia → undefined', () => {
    expect(pickSource(sc({}), landscape)).toBeUndefined();
  });
});
