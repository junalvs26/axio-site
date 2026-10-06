import type { Scene, SceneId } from '../scenes/types';
import { pickSource } from './media';
import { cues, type Cues } from './cues';
import { visibleBeats } from './beats';
import { playDecode } from './decode-dom';
import { trackLocal } from '../scenes/timeline';

interface Track {
  scene: Scene;
  el: HTMLElement;
  top: number;
  height: number;
  beats: HTMLElement[];
  timings: { at: number; kind: string; until?: number }[];
}

type Events = { scene: (id: SceneId) => void; progress: (p: number, local: number) => void };

const IMPACT_AT = 0.55;
const RELEASE_MS = 500;

export class SceneDirector {
  private tracks: Track[] = [];
  private stage: HTMLElement;
  private videos: HTMLVideoElement[];
  private activeSlot = -1;
  /** Incrementa a cada troca de vídeo; respostas de cargas antigas são descartadas. */
  private loadToken = 0;
  private prefetcher = document.createElement('video');
  private broken = new Set<string>();
  private current = -1;
  private lastLocal = 0;
  private lastY = NaN;
  private lastVh = NaN;
  private dirty = true;
  private written = new Map<string, string>();
  private handlers: { [K in keyof Events]: Events[K][] } = { scene: [], progress: [] };
  private onResize = debounce(() => { this.measure(); this.loadVideo(); this.dirty = true; }, 200);

  constructor(root: HTMLElement, list: Scene[], private scrollTo: (y: number) => void) {
    this.stage = document.querySelector<HTMLElement>('.stage')!;
    this.videos = [...this.stage.querySelectorAll<HTMLVideoElement>('.stage__video')];
    this.prefetcher.muted = true;
    this.prefetcher.preload = 'auto';
    this.tracks = list.map((scene) => {
      const el = root.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`)!;
      const beats = [...el.querySelectorAll<HTMLElement>('.beat')];
      return { scene, el, top: 0, height: 0, beats, timings: beats.map((b) => ({ at: Number(b.dataset.at), kind: b.dataset.kind ?? '', until: b.dataset.until ? Number(b.dataset.until) : undefined })) };
    });
    for (const v of this.videos) v.addEventListener('error', () => this.markBroken(v));
  }

  on<K extends keyof Events>(evt: K, cb: Events[K]): void {
    this.handlers[evt].push(cb);
  }

  start(): void {
    this.measure();
    addEventListener('resize', this.onResize);
    addEventListener('orientationchange', this.onResize);
    this.tick();
  }

  destroy(): void {
    removeEventListener('resize', this.onResize);
    removeEventListener('orientationchange', this.onResize);
    this.videos.forEach(release);
  }

  goTo(id: SceneId): void {
    const t = this.tracks.find((t) => t.scene.id === id);
    if (!t) return;
    this.scrollTo(t.top + 2);
    t.el.setAttribute('tabindex', '-1');
    t.el.focus({ preventScroll: true });
  }

  /** Chamado a cada quadro pelo loop de scroll; não faz nada se scroll e viewport não mudaram. */
  tick(): void {
    const y = scrollY;
    const vh = innerHeight;
    if (!this.dirty && y === this.lastY && vh === this.lastVh) return;
    this.dirty = false;
    this.lastY = y;
    this.lastVh = vh;

    let i = 0;
    for (let k = 0; k < this.tracks.length; k++) if (this.tracks[k].top <= y + 1) i = k;
    const t = this.tracks[i];
    // Dois relógios: o vídeo corre pela seção inteira (sem ponto morto entre cenas); textos e
    // luz correm só enquanto o quadro da cena está fixo na tela, para não saírem rolando junto.
    const videoLocal = trackLocal(y, t.top, t.height, vh, i === this.tracks.length - 1);
    const local = trackLocal(y, t.top, t.height, vh, true);

    if (i !== this.current) {
      this.current = i;
      this.lastLocal = local;
      // Cenas fora de quadro assumem estado coerente: anteriores completas, posteriores zeradas.
      this.tracks.forEach((other, k) => k !== i && this.applyBeats(other, k < i ? 1 : 0));
      this.loadVideo();
      this.prefetchNext();
      this.handlers.scene.forEach((cb) => cb(t.scene.id));
    }

    if (t.scene.id === 'impact' && this.lastLocal < IMPACT_AT && local >= IMPACT_AT) this.shake();
    this.lastLocal = local;

    this.applyCues(cues(t.scene.id, local), this.hasVideo());
    this.applyBeats(t, local);
    this.scrub(videoLocal);

    const last = this.tracks[this.tracks.length - 1];
    const p = clamp(y / Math.max(1, last.top + last.height - vh));
    this.handlers.progress.forEach((cb) => cb(p, local));
  }

  private measure(): void {
    for (const t of this.tracks) {
      const r = t.el.getBoundingClientRect();
      t.top = r.top + scrollY;
      t.height = r.height;
    }
  }

  /** Fonte preferida para a orientação; se quebrada, tenta o outro formato. */
  private sourceFor(scene: Scene): string | undefined {
    const first = pickSource(scene, { w: innerWidth, h: innerHeight });
    const other = first === scene.media.desktop ? scene.media.mobile : scene.media.desktop;
    return [first, other].find((s) => s && !this.broken.has(s));
  }

  private hasVideo(): boolean {
    return this.activeSlot >= 0 && this.videos[this.activeSlot].classList.contains('is-active');
  }

  private loadVideo(): void {
    if (this.current < 0) return;
    const src = this.sourceFor(this.tracks[this.current].scene);
    const prev = this.activeSlot >= 0 ? this.videos[this.activeSlot] : undefined;
    if (src && prev?.getAttribute('src') === src) return;

    const token = ++this.loadToken;
    // O vídeo da cena anterior sai imediatamente; nunca fica congelado atrás da cena nova.
    this.videos.forEach((v) => v.classList.remove('is-active'));
    if (prev) setTimeout(() => { if (this.videos[this.activeSlot] !== prev) release(prev); }, RELEASE_MS);
    this.dirty = true;

    if (!src) {
      this.activeSlot = -1;
      return;
    }
    const slot = this.activeSlot === 0 ? 1 : 0;
    const next = this.videos[slot];
    this.activeSlot = slot;
    next.preload = 'auto';
    next.src = src;
    // iOS só decodifica quadros de vídeo que já tocou; muted + playsinline permite.
    next.play().then(() => next.pause()).catch(() => {});
    const ready = () => {
      if (token !== this.loadToken) return;
      next.classList.add('is-active');
      this.dirty = true;
    };
    next.addEventListener('loadeddata', ready, { once: true });
    next.addEventListener('canplay', ready, { once: true });
  }

  private prefetchNext(): void {
    const next = this.tracks[this.current + 1];
    const src = next && this.sourceFor(next.scene);
    if (src && this.prefetcher.getAttribute('src') !== src) this.prefetcher.src = src;
  }

  private markBroken(v: HTMLVideoElement): void {
    const src = v.getAttribute('src');
    if (!src) return;
    this.broken.add(src);
    v.classList.remove('is-active');
    if (this.videos[this.activeSlot] === v) {
      release(v);
      this.activeSlot = -1;
      this.loadVideo();
    }
  }

  private scrub(local: number): void {
    if (!this.hasVideo()) return;
    const v = this.videos[this.activeSlot];
    if (!v.duration || v.seeking) {
      this.dirty = true; // tenta de novo no próximo quadro
      return;
    }
    const slice = this.tracks[this.current].scene.slice;
    const [a, b] = slice ?? [0, v.duration - 0.05];
    const target = Math.min(a + local * (b - a), v.duration - 0.05);
    if (Math.abs(v.currentTime - target) > 1 / 30) v.currentTime = target;
  }

  private set(name: string, value: string): void {
    if (this.written.get(name) === value) return;
    this.written.set(name, value);
    this.stage.style.setProperty(name, value);
  }

  private applyCues(c: Cues, video: boolean): void {
    this.set('--visor', String(video ? 0 : c.visor));
    this.set('--ignite', c.ignite.toFixed(3));
    this.set('--sensor', String(c.sensor));
    this.set('--visor-scale', c.visorScale.toFixed(3));
    this.set('--warm', c.warm.toFixed(3));
    this.set('--glow', c.glow.toFixed(3));
    this.set('--zoom', c.zoom.toFixed(3));
    const rain = c.rain.toFixed(2);
    if (this.stage.dataset.rain !== rain) this.stage.dataset.rain = rain;
  }

  private applyBeats(t: Track, local: number): void {
    const vis = visibleBeats(t.timings, local);
    t.beats.forEach((el, k) => {
      const on = vis[k];
      if (on === el.classList.contains('is-on')) return;
      el.classList.toggle('is-on', on);
      if (on) el.querySelectorAll<HTMLElement>('[data-decode]').forEach(playDecode);
    });
  }

  private shake(): void {
    this.stage.classList.remove('is-shaking');
    void this.stage.offsetWidth;
    this.stage.classList.add('is-shaking');
    this.stage.dispatchEvent(new CustomEvent('impact'));
  }
}

function release(v: HTMLVideoElement): void {
  v.pause();
  v.removeAttribute('src');
  v.load();
}

function clamp(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function debounce(fn: () => void, ms: number): () => void {
  let id = 0;
  return () => { clearTimeout(id); id = window.setTimeout(fn, ms); };
}
