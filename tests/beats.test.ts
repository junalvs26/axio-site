import { describe, it, expect } from 'vitest';
import { visibleBeats } from '../src/runtime/beats';

describe('visibleBeats', () => {
  it('mostra beats cujo "at" já passou', () => {
    expect(visibleBeats([{ at: 0.1, kind: 'kicker' }, { at: 0.5, kind: 'title' }], 0.3)).toEqual([true, false]);
  });
  it('só o passo mais recente fica visível', () => {
    const b = [{ at: 0, kind: 'kicker' }, { at: 0.1, kind: 'step' }, { at: 0.4, kind: 'step' }, { at: 0.7, kind: 'step' }];
    expect(visibleBeats(b, 0.5)).toEqual([true, false, true, false]);
  });
  it('voltar o scroll esconde de novo', () => {
    expect(visibleBeats([{ at: 0.5, kind: 'line' }], 0.2)).toEqual([false]);
  });
});
