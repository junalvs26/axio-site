/**
 * Worker do vídeo da história: baixa, decodifica, guarda e desenha os quadros num OffscreenCanvas.
 * A página só manda a posição da rolagem; nada do vídeo disputa a thread principal com a rolagem.
 * Protocolo em frames-player.ts.
 */
import { FrameStore, GLPainter } from './frames';
import type { ToWorker } from './frames-player';

let painter: GLPainter | undefined;
let store: FrameStore<WebGLTexture> | null = null;
let openId = 0;
let target: { f: number; dir: number; speed: number } | undefined;
let lastPainted = -1;

// Tipos do DOM (não do webworker) valem no projeto todo; o postMessage do worker não tem targetOrigin.
const post = (msg: unknown) => (self as unknown as { postMessage(m: unknown): void }).postMessage(msg);

// Um desenho por quadro de tela, no máximo: posição nova e quadro decodificado chegam várias vezes
// por vsync, e cada desenho a mais é trabalho de GPU que ninguém vê.
const raf: (cb: () => void) => unknown = (self as unknown as { requestAnimationFrame?: (cb: () => void) => number }).requestAnimationFrame?.bind(self)
  ?? ((cb) => setTimeout(cb, 16));
let scheduled = false;

function redraw(): void {
  if (scheduled) return;
  scheduled = true;
  raf(() => { scheduled = false; paint(); });
}

function paint(): void {
  if (!store || !painter || !target) return;
  painter.draw(store, target.f);
  if (painter.painted !== lastPainted) post({ type: 'painted', frame: (lastPainted = painter.painted) });
}

/** Canvas e quadros no tamanho em que o vídeo cobre a tela (vw × vh em pixels), nunca acima do original. */
function fit(vw: number, vh: number): void {
  if (!store || !painter) return;
  const { width: W, height: H } = store.index;
  const k = Math.min(1, Math.max(vw / W, vh / H));
  painter.resize(Math.round(W * k), Math.round(H * k));
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  if (msg.type === 'open') {
    if (msg.canvas) {
      try {
        painter = new GLPainter(msg.canvas);
        msg.canvas.addEventListener('webglcontextlost', () => post({ type: 'error' }));
      } catch {
        return post({ type: 'error' });
      }
    }
    if (!painter) return post({ type: 'error' });
    const id = ++openId;
    store?.close();
    store = null;
    lastPainted = -1;
    const next = await FrameStore.open(msg.url, msg.index, painter);
    if (id !== openId) return next?.close();
    if (!next) return post({ type: 'error' });
    store = next;
    fit(msg.w, msg.h);
    // Trecho baixado ou quadro pronto: pede o que falta para a posição atual (mesmo sem rolagem) e redesenha.
    store.onFrame = () => {
      if (target) store?.want(target.f, target.dir, target.speed);
      redraw();
    };
    store.onError = () => post({ type: 'error' });
    post({ type: 'ready', count: next.count, fps: next.index.fps });
    if (target) store.want(target.f, target.dir, target.speed);
  } else if (msg.type === 'size') {
    fit(msg.w, msg.h);
    redraw();
  } else if (msg.type === 'target') {
    target = msg;
    store?.want(msg.f, msg.dir, msg.speed);
    redraw();
  }
};
