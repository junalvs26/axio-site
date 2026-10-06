import type { Scene, SceneId, SceneMedia } from './types';
import generated from './media.generated.json';
import storyTimings from './story.generated.json';
import { asset } from '../lib/asset';

const withBase = (m: SceneMedia): SceneMedia =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v && asset(v)])) as SceneMedia;
const media = Object.fromEntries(
  Object.entries(generated as Record<string, SceneMedia>).map(([k, v]) => [k, withBase(v)]),
) as Partial<Record<SceneId | 'story', SceneMedia>>;
const slices = storyTimings as Partial<Record<SceneId, [number, number]>>;
/** Vídeo único com todas as cenas: o scroll o percorre sem trocar de arquivo. */
const story = media.story;

const def = (id: SceneId, range: [number, number], enabled = true): Scene => {
  const own = media[id] ?? {};
  const slice = slices[id];
  // Sem o clipe do mergulho, o prólogo segura o 1º quadro do pouso.
  if (story && id === 'prelude' && !slice) return { id, range, enabled, slice: [0, 0], media: { desktop: story.desktop, mobile: story.mobile } };
  if (story && slice) return { id, range, enabled, slice, media: { desktop: story.desktop, mobile: story.mobile, poster: own.poster } };
  return { id, range, enabled, media: own };
};

/** Ordem e faixas de scroll da spec §4. */
export const scenes: Scene[] = [
  // Prólogo: mergulho pelas nuvens que termina no 1º quadro do pouso.
  def('prelude', [-0.12, 0]),
  def('impact', [0, 0.12]),
  def('awakening', [0.12, 0.22]),
  def('city', [0.22, 0.32]),
  def('analysis', [0.32, 0.43]),
  def('action', [0.43, 0.68]),
  def('solution', [0.68, 0.78]),
  def('transformation', [0.78, 0.88]),
  def('proof', [0.88, 0.88], false),
  def('final', [0.88, 1]),
];

/** Altura total da história em viewports, distribuída pelas faixas. */
export const STORY_VH = 1790;
