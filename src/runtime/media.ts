import type { Scene } from '../scenes/types';

/** Escolhe o vídeo da cena para a orientação atual, caindo para o outro formato se faltar. */
/** Índice de quadros que acompanha o vídeo escolhido por pickSource. */
export function pickIndex(scene: Scene, src: string | undefined): string | undefined {
  const { desktop, desktopIndex, mobileIndex } = scene.media;
  return src === undefined ? undefined : src === desktop ? desktopIndex : mobileIndex;
}

export function pickSource(scene: Scene, viewport: { w: number; h: number }): string | undefined {
  const { desktop, mobile } = scene.media;
  return viewport.h > viewport.w ? mobile ?? desktop : desktop ?? mobile;
}
