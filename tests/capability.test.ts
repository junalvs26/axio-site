import { describe, it, expect } from 'vitest';
import { tier } from '../src/runtime/capability';

const base = { reducedMotion: false, saveData: false };

describe('tier', () => {
  it('reduced motion → static', () => expect(tier({ ...base, reducedMotion: true })).toBe('static'));
  it('saveData → lite', () => expect(tier({ ...base, saveData: true })).toBe('lite'));
  it('pouca memória → lite', () => expect(tier({ ...base, deviceMemory: 2 })).toBe('lite'));
  it('conexão 3g → lite', () => expect(tier({ ...base, effectiveType: '3g' })).toBe('lite'));
  it('padrão → full', () => expect(tier({ ...base, deviceMemory: 8, effectiveType: '4g' })).toBe('full'));
});
