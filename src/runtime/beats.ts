export interface BeatTiming { at: number; kind: string }

/** Quais beats aparecem num progresso local. Passos se substituem: só o mais recente fica. */
export function visibleBeats(list: BeatTiming[], local: number): boolean[] {
  const lastStep = list.reduce((acc, b, i) => (b.kind === 'step' && b.at <= local ? i : acc), -1);
  return list.map((b, i) => b.at <= local && (b.kind !== 'step' || i === lastStep));
}
