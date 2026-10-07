import type { SceneDirector } from './director';
import type { SceneId } from '../scenes/types';

/** Links internos (marca no topo, CTA final, pular para o contato) navegam pela história com rolagem suave. */
export function bindNav(director: SceneDirector): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href')!.slice(1) as SceneId;
    if (!document.querySelector(`[data-scene="${id}"]`)) return;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      director.goTo(id);
      history.replaceState(null, '', `#${id}`);
    });
  });
}
