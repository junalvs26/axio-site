import type { Scene } from '../scenes/types';

/** Escolhe o vídeo da cena para a orientação atual, caindo para o outro formato se faltar. */
export function pickSource(scene: Scene, viewport: { w: number; h: number }): string | undefined {
  const { desktop, mobile } = scene.media;
  return viewport.h > viewport.w ? mobile ?? desktop : desktop ?? mobile;
}
