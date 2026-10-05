const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>[]=+';

/** Quadro do efeito "texto sendo processado": caracteres resolvem da esquerda para a direita. */
export function decodeFrame(target: string, t: number, seed: number): string {
  if (t >= 1) return target;
  const resolved = Math.floor(target.length * Math.max(0, t));
  let s = seed >>> 0;
  let out = '';
  for (let i = 0; i < target.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const c = target[i];
    out += i < resolved || c === ' ' ? c : GLYPHS[s % GLYPHS.length];
  }
  return out;
}
