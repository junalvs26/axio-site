import { describe, it, expect } from 'vitest';
import { scenes } from '../src/scenes/config';
import { locate, normalizeRanges, trackLocal } from '../src/scenes/timeline';
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
  it('início → prólogo local 0', () => {
    const { scene, local } = locate(0, list);
    expect(scene.id).toBe('prelude');
    expect(local).toBe(0);
  });
  it('meio do despertar → awakening local 0.5', () => {
    // faixas brutas: prólogo 0,12 + impact 0,12 + metade do despertar 0,05, sobre o total 1,12
    const { scene, local } = locate(0.29 / 1.12, list);
    expect(scene.id).toBe('awakening');
    expect(local).toBeCloseTo(0.5);
  });
  it('1 → final local 1', () => {
    const { scene, local } = locate(1, list);
    expect(scene.id).toBe('final');
    expect(local).toBe(1);
  });
  it('faz clamp fora de 0–1', () => {
    expect(locate(-0.2, list).scene.id).toBe('prelude');
    expect(locate(1.3, list)).toMatchObject({ local: 1 });
  });
  it('cena sem mídia não lança', () => {
    expect(() => locate(0.5, list)).not.toThrow();
  });
});

describe('trackLocal', () => {
  const vh = 900;
  it('cena do meio continua avançando na última tela (vídeo contínuo não congela)', () => {
    // seção de 3000px: a 450px do fim ainda não pode estar em 1
    expect(trackLocal(3000 - 450, 0, 3000, vh, false)).toBeCloseTo(2550 / 3000);
  });
  it('cena do meio chega a 1 exatamente onde começa a próxima', () => {
    expect(trackLocal(3000, 0, 3000, vh, false)).toBe(1);
  });
  it('última cena chega a 1 no fim da página (altura menos a tela)', () => {
    expect(trackLocal(2100, 0, 3000, vh, true)).toBe(1);
  });
});
