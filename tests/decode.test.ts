import { describe, it, expect } from 'vitest';
import { decodeFrame } from '../src/runtime/decode';

const target = 'Pontos cegos identificados';

describe('decodeFrame', () => {
  it('t=1 retorna o texto final', () => expect(decodeFrame(target, 1, 7)).toBe(target));
  it('mantém o comprimento', () => {
    for (const t of [0, 0.3, 0.7]) expect(decodeFrame(target, t, 7)).toHaveLength(target.length);
  });
  it('mantém espaços', () => {
    const out = decodeFrame(target, 0.2, 3);
    [...target].forEach((c, i) => { if (c === ' ') expect(out[i]).toBe(' '); });
  });
  it('é determinístico por seed', () => expect(decodeFrame(target, 0.4, 9)).toBe(decodeFrame(target, 0.4, 9)));
});
