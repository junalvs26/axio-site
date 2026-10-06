/** Velocidade (px/quadro) em que os textos atingem a reação máxima. */
const FULL = 45;
const EASE = 0.12;

/** Aproxima a velocidade suavizada do valor atual, para os textos não tremerem. */
export function smoothVelocity(current: number, target: number): number {
  return current + (target - current) * EASE;
}

/** Converte velocidade em variáveis de CSS: vel com sinal (−1…1) e speed em módulo (0…1). */
export function velocityVars(v: number): { vel: number; speed: number } {
  const vel = Math.max(-1, Math.min(1, Math.round((v / FULL) * 1000) / 1000)) || 0;
  return { vel, speed: Math.abs(vel) };
}

/** Publica --vel e --speed no <html> a cada quadro, só quando mudam de forma perceptível. */
export function bindVelocity(read: () => number): () => void {
  const root = document.documentElement;
  let smooth = 0;
  let shown = { vel: NaN, speed: NaN };
  return () => {
    smooth = smoothVelocity(smooth, read());
    const next = velocityVars(Math.abs(smooth) < 0.05 ? 0 : smooth);
    if (Math.abs(next.vel - shown.vel) < 0.01 && !(next.vel === 0 && shown.vel !== 0)) return;
    shown = next;
    root.style.setProperty('--vel', String(next.vel));
    root.style.setProperty('--speed', String(next.speed));
  };
}
