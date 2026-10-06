import { describe, it, expect } from 'vitest';
import { smoothVelocity, velocityVars } from '../src/runtime/velocity';

describe('velocidade do scroll', () => {
  it('parado → textos em repouso', () => {
    expect(velocityVars(0)).toEqual({ vel: 0, speed: 0 });
  });
  it('rolar para baixo dá vel positiva e speed igual ao módulo', () => {
    const v = velocityVars(20);
    expect(v.vel).toBeGreaterThan(0);
    expect(v.speed).toBe(v.vel);
  });
  it('rolar para cima dá vel negativa e speed positiva', () => {
    const v = velocityVars(-20);
    expect(v.vel).toBeLessThan(0);
    expect(v.speed).toBe(-v.vel);
  });
  it('satura em ±1 num scroll muito rápido', () => {
    expect(velocityVars(10_000).vel).toBe(1);
    expect(velocityVars(-10_000).vel).toBe(-1);
  });
  it('suavização aproxima do alvo sem saltar', () => {
    const s = smoothVelocity(0, 40);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(40);
  });
});
