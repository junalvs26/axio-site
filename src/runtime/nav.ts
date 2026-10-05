import type { SceneDirector } from './director';
import type { SceneId } from '../scenes/types';

/** Índice de capítulos e CTAs navegam pela história; capítulo ativo marcado. */
export function bindNav(director: SceneDirector): void {
  const nav = document.querySelector<HTMLElement>('.nav')!;
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-chapter]')];
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href')!.slice(1) as SceneId;
    if (!document.querySelector(`[data-scene="${id}"]`)) return;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      director.goTo(id);
      history.replaceState(null, '', `#${id}`);
    });
  });
  director.on('scene', (id) => {
    for (const a of links) {
      if (a.dataset.chapter === id) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    }
  });
  director.on('progress', (p) => nav.style.setProperty('--p', p.toFixed(4)));
}
