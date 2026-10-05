import type { Scene, SceneId, SceneMedia } from './types';
import generated from './media.generated.json';

const media = generated as Partial<Record<SceneId, SceneMedia>>;

const def = (id: SceneId, range: [number, number], enabled = true): Scene => ({
  id, range, enabled, media: media[id] ?? {},
});

/** Ordem e faixas de scroll da spec §4. */
export const scenes: Scene[] = [
  def('impact', [0, 0.12]),
  def('awakening', [0.12, 0.2]),
  def('city', [0.2, 0.3]),
  def('analysis', [0.3, 0.42]),
  def('action', [0.42, 0.68]),
  def('solution', [0.68, 0.78]),
  def('transformation', [0.78, 0.88]),
  def('proof', [0.88, 0.88], false),
  def('final', [0.88, 1]),
];

/** Altura total da história em viewports, distribuída pelas faixas. */
export const STORY_VH = 1600;
