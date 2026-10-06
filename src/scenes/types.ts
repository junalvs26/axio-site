export type SceneId =
  | 'prelude' | 'impact' | 'awakening' | 'city' | 'analysis' | 'action'
  | 'solution' | 'transformation' | 'proof' | 'final';

export interface SceneMedia { desktop?: string; mobile?: string; poster?: string }

export interface Scene {
  id: SceneId;
  /** Fatia do progresso total da história, 0–1. */
  range: [number, number];
  enabled: boolean;
  media: SceneMedia;
  /** Trecho [início, fim] em segundos quando a cena vive dentro do vídeo contínuo da história. */
  slice?: [number, number];
}
