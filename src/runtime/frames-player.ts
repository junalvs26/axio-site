/**
 * Lado da página do vídeo da história: entrega o canvas ao worker (frames.worker.ts) e manda a
 * posição da rolagem a cada quadro. Sem OffscreenCanvas ou WebCodecs, quem chama usa o <video>.
 */
export type ToWorker =
  | { type: 'open'; canvas?: OffscreenCanvas; url: string; index: string; w: number; h: number }
  | { type: 'size'; w: number; h: number }
  | { type: 'target'; f: number; dir: number; speed: number };

type FromWorker = { type: 'ready'; count: number; fps: number } | { type: 'error' } | { type: 'painted'; frame: number };

export function playerSupported(): boolean {
  return typeof window !== 'undefined' && 'VideoDecoder' in window && 'Worker' in window
    && 'transferControlToOffscreen' in HTMLCanvasElement.prototype;
}

export class FramePlayer {
  private worker = new Worker(new URL('./frames.worker.ts', import.meta.url), { type: 'module' });
  private offscreen: OffscreenCanvas | undefined;
  private sent = '';
  /** Conhecidos depois do 'ready'. */
  count = 0;
  fps = 0;
  ready = false;
  onReady: () => void = () => {};
  onError: () => void = () => {};
  onPainted: (frame: number) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.offscreen = canvas.transferControlToOffscreen();
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.type === 'ready') { this.count = m.count; this.fps = m.fps; this.ready = true; this.onReady(); }
      else if (m.type === 'error') { this.ready = false; this.onError(); }
      else this.onPainted(m.frame);
    };
    this.worker.onerror = () => { this.ready = false; this.onError(); };
  }

  open(url: string, index: string, w: number, h: number): void {
    this.ready = false;
    this.sent = '';
    const canvas = this.offscreen;
    this.offscreen = undefined; // o canvas só pode ser transferido uma vez
    const msg: ToWorker = { type: 'open', canvas, url, index, w, h };
    this.worker.postMessage(msg, canvas ? [canvas] : []);
  }

  size(w: number, h: number): void {
    const msg: ToWorker = { type: 'size', w, h };
    this.worker.postMessage(msg);
  }

  /** Posição em quadros; só manda quando muda. */
  target(f: number, dir: number, speed: number): void {
    const key = `${f.toFixed(2)}:${dir}`;
    if (key === this.sent) return;
    this.sent = key;
    const msg: ToWorker = { type: 'target', f, dir, speed };
    this.worker.postMessage(msg);
  }

  close(): void {
    this.worker.terminate();
  }
}
