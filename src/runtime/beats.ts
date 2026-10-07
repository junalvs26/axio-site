export interface BeatTiming { at: number; kind: string; until?: number }

export interface BeatPhase { in: number; out: number }

/** Quanto do progresso local cada beat leva para entrar inteiro. */
const ENTER = 0.14;
/** Janela de saída, centrada no ponto em que o beat dá lugar ao seguinte (cruza com a entrada dele). */
const EXIT = 0.1;
/** Fora a última cena, tudo sobe e some nesse trecho final, antes da cena seguinte abrir. */
const SCENE_OUT = 0.9;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Entrada e saída contínuas de cada beat (0–1) em função do progresso local: o texto anda junto
 * com a rolagem e volta pelo mesmo caminho. Passos saem quando o seguinte entra; beats com "until"
 * saem nesse ponto; o resto sai no fim da cena.
 */
export function beatPhases(list: BeatTiming[], local: number, isLast: boolean): BeatPhase[] {
  return list.map((b, i) => {
    const enter = b.at <= 0 ? 1 : clamp01((local - b.at) / ENTER);
    const next = b.kind === 'step' ? list.slice(i + 1).find((n) => n.kind === 'step') : undefined;
    const end = b.until ?? next?.at;
    const out = end !== undefined
      ? clamp01((local - (end - EXIT / 2)) / EXIT)
      : isLast ? 0 : clamp01((local - SCENE_OUT) / (1 - SCENE_OUT));
    return { in: enter, out };
  });
}
