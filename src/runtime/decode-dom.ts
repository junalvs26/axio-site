import { decodeFrame } from './decode';

const DURATION = 650;

/** Revela o texto de um elemento como se estivesse sendo processado. */
export function playDecode(el: HTMLElement): void {
  const text = (el.dataset.text ??= el.textContent ?? '');
  el.setAttribute('aria-label', text);
  const seed = text.length * 31;
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / DURATION);
    el.textContent = decodeFrame(text, t, seed + Math.floor(now / 50));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
