export type SceneId =
  | 'impact' | 'awakening' | 'city' | 'analysis' | 'action'
  | 'solution' | 'transformation' | 'proof' | 'final';

export interface SceneMedia { desktop?: string; mobile?: string; poster?: string }

export interface Scene {
  id: SceneId;
  /** Fatia do progresso total da história, 0–1. */
  range: [number, number];
  enabled: boolean;
  media: SceneMedia;
}
