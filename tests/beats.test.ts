import { describe, it, expect } from 'vitest';
import { beatPhases } from '../src/runtime/beats';

describe('beatPhases', () => {
  const r = (n: number) => Math.round(n * 100) / 100;
  const phases = (b: Parameters<typeof beatPhases>[0], local: number, last = false) =>
    beatPhases(b, local, last).map((p) => [r(p.in), r(p.out)]);

  it('entra junto com a rolagem a partir do "at"', () => {
    const b = [{ at: 0.2, kind: 'title' }];
    expect(phases(b, 0.1)).toEqual([[0, 0]]);
    expect(phases(b, 0.27)).toEqual([[0.5, 0]]);
    expect(phases(b, 0.4)).toEqual([[1, 0]]);
  });
  it('beat em at=0 já nasce inteiro', () => {
    expect(phases([{ at: 0, kind: 'line' }], 0)).toEqual([[1, 0]]);
  });
  it('sai no fim da cena, menos na última', () => {
    const b = [{ at: 0.1, kind: 'line' }];
    expect(phases(b, 0.95)).toEqual([[1, 0.5]]);
    expect(phases(b, 1)).toEqual([[1, 1]]);
    expect(phases(b, 1, true)).toEqual([[1, 0]]);
  });
  it('passo sai cruzando com a entrada do seguinte', () => {
    const b = [{ at: 0.1, kind: 'step' }, { at: 0.5, kind: 'step' }];
    expect(phases(b, 0.5)).toEqual([[1, 0.5], [0, 0]]);
    expect(phases(b, 0.57)).toEqual([[1, 1], [0.5, 0]]);
  });
  it('"until" fecha o beat em volta do ponto', () => {
    expect(phases([{ at: 0, kind: 'line', until: 0.3 }], 0.3)).toEqual([[1, 0.5]]);
  });
  it('é reversível: mesmo local, mesmo estado', () => {
    const b = [{ at: 0.2, kind: 'title' }];
    expect(phases(b, 0.25)).toEqual(phases(b, 0.25));
  });
});
