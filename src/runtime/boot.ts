import Lenis from 'lenis';
import { scenes } from '../scenes/config';
import { normalizeRanges } from '../scenes/timeline';
import type { SceneId } from '../scenes/types';
import { SceneDirector } from './director';
import { tier, readEnv } from './capability';
import { bindNav } from './nav';
import { startParticles } from './particles';
import { startCursor } from './cursor';
import { bindSound } from './sound';

export function boot(): void {
  const level = tier(readEnv());
  const html = document.documentElement;
  bindSound(document.querySelector<HTMLButtonElement>('[data-sound]'));
  if (level === 'static') {
    html.classList.remove('is-cinema');
    return;
  }
  html.classList.add('is-cinema');
  html.dataset.tier = level;

  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  const root = document.getElementById('story')!;
  const director = new SceneDirector(root, normalizeRanges(scenes), (y) => lenis.scrollTo(y, { duration: 1.4 }));
  bindNav(director);

  const stage = document.querySelector<HTMLElement>('.stage')!;
  if (level === 'full') {
    startParticles(stage.querySelector('canvas')!, stage);
    startCursor(stage);
  }

  director.start();
  html.dataset.booted = '1';
  const target = location.hash.slice(1) as SceneId;
  if (target) requestAnimationFrame(() => director.goTo(target));

  const loop = (t: number) => {
    lenis.raf(t);
    director.tick();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
