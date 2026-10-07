import { describe, it, expect } from 'vitest';
import { offsets, segmentOf, segmentBytes, framePlan, segmentPlan, evict, SEG } from '../src/runtime/frames';

const idx = { start: 100, sizes: Array.from({ length: 60 }, (_, i) => 10 + i) };

describe('índice de quadros', () => {
  it('posições vêm do início + tamanhos acumulados', () => {
    const off = offsets(idx);
    expect(off[0]).toBe(100);
    expect(off[1]).toBe(110);
    expect(off[2]).toBe(121);
  });
  it('trecho de bytes de um segmento cobre do 1º ao último quadro dele', () => {
    const off = offsets(idx);
    const [a, b] = segmentBytes(idx, off, 1);
    expect(a).toBe(off[SEG]);
    expect(b).toBe(off[2 * SEG - 1] + idx.sizes[2 * SEG - 1] - 1);
  });
  it('último segmento termina no último quadro', () => {
    const off = offsets(idx);
    const last = segmentOf(59);
    expect(segmentBytes(idx, off, last)[1]).toBe(off[59] + idx.sizes[59] - 1);
  });
});

describe('framePlan', () => {
  it('pede o par em volta da posição e segue na direção da rolagem', () => {
    expect(framePlan(10.4, 1, 60, 3)).toEqual([10, 11, 12, 13, 14]);
    expect(framePlan(10.4, -1, 60, 3)).toEqual([10, 11, 9, 8, 7]);
  });
  it('parado, olha para frente', () => {
    expect(framePlan(5, 0, 60, 2)).toEqual([5, 6, 7, 8]);
  });
  it('rápido: salta quadros na direção da rolagem (a tela não mostra mais que 60 por segundo)', () => {
    expect(framePlan(10, 1, 100, 3, 4)).toEqual([10, 11, 15, 19, 23]);
    expect(framePlan(50, -1, 100, 2, 3)).toEqual([50, 51, 47, 44]);
  });
  it('nunca sai do vídeo', () => {
    expect(framePlan(59.5, 1, 60, 3)).toEqual([59]);
    expect(framePlan(0.2, -1, 60, 3)).toEqual([0, 1]);
  });
});

describe('segmentPlan', () => {
  it('segmento atual primeiro, depois à frente, e um atrás', () => {
    expect(segmentPlan(30, 1, 10, 2)).toEqual([1, 2, 3, 0]);
    expect(segmentPlan(30, -1, 10, 2)).toEqual([1, 0, 2]);
  });
});

describe('evict', () => {
  it('descarta os mais distantes da posição até caber', () => {
    expect(evict([1, 2, 3, 10, 20], 3, 3)).toEqual([20, 10]);
    expect(evict([1, 2], 3, 3)).toEqual([]);
  });
  it('nunca descarta quadros do plano atual (senão ele pede de novo, em ciclo)', () => {
    // parado em 35 depois de rolar: quadros atrás estão mais perto, mas o plano vai até 48
    const cached = [30, 31, 32, 33, 34, 35, 36, 38, 40, 42, 44, 46, 48];
    const out = evict(cached, 35, 10, new Set([35, 36, 38, 40, 42, 44, 46, 48]));
    expect(out).toEqual([30, 31, 32]);
  });
});
