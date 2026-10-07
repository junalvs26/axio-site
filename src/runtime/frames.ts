/**
 * Vídeo da história sem <video>: decodifica cada quadro com WebCodecs e guarda os vizinhos da
 * posição de rolagem já prontos para desenhar. A rolagem só escolhe qual quadro pintar no canvas,
 * sem busca (seek) nem reinício do decodificador. O arquivo é todo keyframe (-g 1), então qualquer
 * quadro decodifica sozinho, em qualquer ordem. Índice gerado por scripts/build-story.py.
 * Roda dentro de frames.worker.ts: download, decodificação e desenho ficam fora da thread principal.
 */

export interface FrameIndex {
  codec: string;
  /** Caixa avcC em base64. */
  description: string;
  width: number;
  height: number;
  fps: number;
  /** Posição do 1º quadro no arquivo; os demais vêm em sequência. */
  start: number;
  sizes: number[];
}

/** Quadros por requisição Range (1 s de vídeo). */
export const SEG = 24;
/** Segmentos baixados à frente da rolagem, no mínimo; cresce com a velocidade (ver want). */
const SEG_AHEAD = 3;
const SEG_AHEAD_MAX = 12;
/** Quadros decodificados à frente do par atual. */
const AHEAD = 6;
/** Quadros prontos guardados como textura (cada 1080p ocupa ~8 MB de memória de vídeo). */
const CACHE = 12;
const MAX_FETCHES = 3;
const MAX_QUEUE = 2;
/** Quanto à frente (s) mirar os quadros antecipados: cobre a latência de decodificação. */
const LEAD = 0.08;

export function offsets(idx: Pick<FrameIndex, 'start' | 'sizes'>): number[] {
  const out = new Array<number>(idx.sizes.length);
  let at = idx.start;
  for (let i = 0; i < idx.sizes.length; i++) { out[i] = at; at += idx.sizes[i]; }
  return out;
}

export const segmentOf = (frame: number): number => Math.floor(frame / SEG);

/** [primeiro, último] byte do segmento, inclusivo (formato do cabeçalho Range). */
export function segmentBytes(idx: Pick<FrameIndex, 'sizes'>, off: number[], seg: number): [number, number] {
  const a = seg * SEG;
  const b = Math.min(idx.sizes.length, a + SEG) - 1;
  return [off[a], off[b] + idx.sizes[b] - 1];
}

/**
 * Ordem de decodificação: o par em volta da posição, depois `ahead` quadros na direção da rolagem,
 * espaçados de `stride` (rolagem rápida: a tela só mostra até 60 quadros por segundo).
 */
export function framePlan(f: number, dir: number, count: number, ahead = AHEAD, stride = 1): number[] {
  const a = Math.floor(f);
  const step = dir < 0 ? -1 : 1;
  const out = [a, a + 1];
  for (let k = 1; k <= ahead; k++) out.push(step > 0 ? a + 1 + k * stride : a - k * stride);
  return out.filter((i) => i >= 0 && i < count);
}

/** Ordem de download: segmento atual, `ahead` à frente e um atrás. */
export function segmentPlan(f: number, dir: number, segCount: number, ahead = SEG_AHEAD): number[] {
  const s = segmentOf(Math.max(0, f));
  const step = dir < 0 ? -1 : 1;
  const out = [s];
  for (let k = 1; k <= ahead; k++) out.push(s + step * k);
  out.push(s - step);
  return out.filter((x) => x >= 0 && x < segCount);
}

/**
 * Quais quadros sair do cache para caber em `max`: os mais distantes da posição, nunca os do plano
 * atual (`keep`). Descartar um quadro planejado faria want() pedi-lo de novo, num ciclo sem fim.
 */
export function evict(keys: number[], center: number, max: number, keep: Set<number> = new Set()): number[] {
  if (keys.length <= max) return [];
  return keys.filter((k) => !keep.has(k))
    .sort((x, y) => Math.abs(y - center) - Math.abs(x - center))
    .slice(0, keys.length - max);
}

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));


/** Onde um quadro decodificado fica guardado (no worker: uma textura WebGL). */
export interface FrameSink<R> {
  /** Copia o quadro para o recurso; o VideoFrame é fechado logo depois por quem chama. */
  upload(frame: VideoFrame): R;
  dispose(r: R): void;
}

export class FrameStore<R> {
  readonly count: number;
  private off: number[];
  private segs = new Map<number, { base: number; buf: Uint8Array }>();
  private fetching = new Set<number>();
  private cache = new Map<number, R>();
  private pending = new Set<number>();
  private decoder: VideoDecoder;
  private abort = new AbortController();
  private closed = false;
  private center = 0;
  /** Quadros que a posição atual precisa: protegidos do descarte. */
  private plan = new Set<number>();
  failed = false;
  /** Chamado quando um quadro novo fica pronto (para redesenhar). */
  onFrame: () => void = () => {};
  /** Chamado uma vez se o decodificador ou o download falhar (cai para o <video>). */
  onError: (e: unknown) => void = () => {};

  private constructor(private url: string, readonly index: FrameIndex, config: VideoDecoderConfig, private sink: FrameSink<R>) {
    this.count = index.sizes.length;
    this.off = offsets(index);
    this.decoder = new VideoDecoder({ output: (f) => this.received(f), error: (e) => this.fail(e) });
    this.decoder.configure(config);
  }

  /** null quando o navegador não decodifica esse vídeo: quem chama usa o <video>. */
  static async open<R>(url: string, indexUrl: string, sink: FrameSink<R>): Promise<FrameStore<R> | null> {
    if (typeof VideoDecoder === 'undefined') return null;
    try {
      const res = await fetch(indexUrl);
      if (!res.ok) return null;
      const index = (await res.json()) as FrameIndex;
      // Hardware primeiro: o quadro já nasce na GPU e vira textura WebGL quase de graça. Com
      // software, cada 1080p era convertido e copiado da CPU (medido numa Iris Xe: 17 ms contra
      // 33–133 ms por quadro de tela). Sem hardware, usa o que o navegador tiver.
      for (const accel of ['prefer-hardware', 'no-preference'] as const) {
        const config = FrameStore.configFor(index, accel);
        if ((await VideoDecoder.isConfigSupported(config)).supported) return new FrameStore(url, index, config, sink);
      }
      return null;
    } catch {
      return null;
    }
  }

  private static configFor(index: FrameIndex, hardwareAcceleration: HardwareAcceleration): VideoDecoderConfig {
    return {
      codec: index.codec, description: b64(index.description),
      codedWidth: index.width, codedHeight: index.height, optimizeForLatency: true, hardwareAcceleration,
    };
  }

  get(i: number): R | undefined {
    return this.cache.get(i);
  }

  /** O quadro pronto mais próximo de f, para nunca deixar o palco vazio durante um salto. */
  nearest(f: number): [number, R] | undefined {
    let best: [number, R] | undefined;
    let dist = Infinity;
    for (const [i, bmp] of this.cache) {
      const d = Math.abs(i - f);
      if (d < dist) { dist = d; best = [i, bmp]; }
    }
    return best;
  }

  /**
   * Baixa e decodifica o que a posição f precisa. dir é o sentido da rolagem (−1, 0, 1) e speed a
   * velocidade em quadros por segundo: quanto mais rápido, mais longe o download vai à frente.
   * Sem nada urgente, continua baixando o resto do vídeo em segundo plano, um segmento por vez.
   */
  want(f: number, dir: number, speed = 0): void {
    if (this.closed || this.failed) return;
    this.center = f;
    const segCount = segmentOf(this.count - 1) + 1;
    const ahead = Math.min(SEG_AHEAD_MAX, SEG_AHEAD + Math.ceil(speed / SEG));
    for (const s of segmentPlan(f, dir, segCount, ahead)) {
      if (this.fetching.size >= MAX_FETCHES) break;
      if (!this.segs.has(s) && !this.fetching.has(s)) void this.load(s);
    }
    if (this.fetching.size === 0) {
      const from = segmentOf(Math.max(0, f));
      for (let k = 0; k < segCount; k++) {
        const s = (from + k) % segCount;
        if (!this.segs.has(s)) { void this.load(s); break; }
      }
    }
    const stride = Math.max(1, Math.round(speed / 60));
    // Rápido, o par atual já terá passado quando sair do decodificador: mira onde a rolagem vai estar.
    const lead = dir === 0 ? 0 : Math.min(SEG, speed * LEAD) * dir;
    const plan = lead === 0 ? framePlan(f, dir, this.count, AHEAD, stride)
      : [...framePlan(f + lead, dir, this.count, AHEAD, stride), ...framePlan(f, dir, this.count, 0)];
    this.plan = new Set(plan);
    for (const i of plan) {
      if (this.decoder.decodeQueueSize >= MAX_QUEUE) break;
      if (this.cache.has(i) || this.pending.has(i)) continue;
      const data = this.data(i);
      if (!data) continue;
      this.pending.add(i);
      this.decoder.decode(new EncodedVideoChunk({ type: 'key', timestamp: Math.round((i * 1e6) / this.index.fps), data }));
    }
  }

  close(): void {
    this.closed = true;
    this.abort.abort();
    for (const r of this.cache.values()) this.sink.dispose(r);
    this.cache.clear();
    if (this.decoder.state !== 'closed') this.decoder.close();
  }

  private data(i: number): Uint8Array | undefined {
    const seg = this.segs.get(segmentOf(i));
    if (!seg) return undefined;
    const at = this.off[i] - seg.base;
    return seg.buf.subarray(at, at + this.index.sizes[i]);
  }

  private async load(s: number): Promise<void> {
    this.fetching.add(s);
    const [a, b] = segmentBytes(this.index, this.off, s);
    try {
      const res = await fetch(this.url, { headers: { Range: `bytes=${a}-${b}` }, signal: this.abort.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (res.status === 206) this.segs.set(s, { base: a, buf });
      else {
        // Servidor sem suporte a Range devolveu o arquivo inteiro: serve para todos os segmentos.
        const all = { base: 0, buf };
        for (let k = 0; k <= segmentOf(this.count - 1); k++) this.segs.set(k, all);
      }
      this.onFrame(); // há dados novos: o próximo quadro já pode pedir decodificação
    } catch (e) {
      if (!this.closed) this.fail(e);
    } finally {
      this.fetching.delete(s);
    }
  }

  private received(frame: VideoFrame): void {
    const i = Math.round((frame.timestamp * this.index.fps) / 1e6);
    this.pending.delete(i);
    if (this.closed) return frame.close();
    let r: R;
    try {
      r = this.sink.upload(frame);
    } catch (e) {
      return this.fail(e);
    } finally {
      frame.close();
    }
    const old = this.cache.get(i);
    if (old !== undefined) this.sink.dispose(old);
    this.cache.set(i, r);
    for (const k of evict([...this.cache.keys()], this.center, CACHE, this.plan)) {
      this.sink.dispose(this.cache.get(k)!);
      this.cache.delete(k);
    }
    this.onFrame();
  }

  private fail(e: unknown): void {
    if (this.failed || this.closed) return;
    this.failed = true;
    this.onError(e);
  }
}

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = vec2(p.x + 1.0, 1.0 - p.y) * 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D a;
uniform sampler2D b;
uniform float w;
in vec2 uv;
out vec4 o;
void main() { o = mix(texture(a, uv), texture(b, uv), w); }`;

/**
 * Pinta o quadro f num OffscreenCanvas com WebGL2: cada quadro decodificado vira uma textura
 * direto do VideoFrame (sem createImageBitmap nem raster 2D) e um único draw mistura os dois
 * vizinhos (24 fps de vídeo em 60 de tela). A GPU faz a escala para o tamanho do canvas.
 */
export class GLPainter implements FrameSink<WebGLTexture> {
  private gl: WebGL2RenderingContext;
  private ua: WebGLUniformLocation;
  private ub: WebGLUniformLocation;
  private uw: WebGLUniformLocation;
  private last = '';
  /** Índice do quadro na tela: o exato ou, durante um salto, o vizinho pronto mais próximo. */
  painted = -1;

  constructor(private canvas: OffscreenCanvas) {
    // Sem preserveDrawingBuffer: ele obriga uma cópia do buffer a cada apresentação; a tela mantém o último quadro.
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 indisponível');
    this.gl = gl;
    const prog = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      gl.attachShader(prog, sh);
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'shader');
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.ua = gl.getUniformLocation(prog, 'a')!;
    this.ub = gl.getUniformLocation(prog, 'b')!;
    this.uw = gl.getUniformLocation(prog, 'w')!;
    gl.uniform1i(this.ua, 0);
    gl.uniform1i(this.ub, 1);
  }

  upload(frame: VideoFrame): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
    return tex;
  }

  dispose(tex: WebGLTexture): void {
    this.gl.deleteTexture(tex);
  }

  resize(w: number, h: number): void {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
      this.last = '';
    }
  }

  draw(store: FrameStore<WebGLTexture>, f: number): void {
    const a = Math.floor(f);
    const w = f - a;
    let A = store.get(a);
    let B = w > 0.01 ? store.get(a + 1) : undefined;
    let shown = a;
    let key = `${a}:${B ? w.toFixed(2) : '-'}`;
    if (!A) {
      const n = store.nearest(f);
      if (!n) return;
      [shown, A, B] = [n[0], n[1], undefined];
      key = `near:${n[0]}`;
    }
    if (key === this.last) return;
    this.last = key;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, A);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, B ?? A);
    gl.uniform1f(this.uw, B ? w : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.painted = shown;
  }
}
