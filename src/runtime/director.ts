import type { Scene, SceneId } from '../scenes/types';
import { pickSource } from './media';
import { cues, type Cues } from './cues';
import { visibleBeats } from './beats';
import { playDecode } from './decode-dom';

interface Track {
  scene: Scene;
  el: HTMLElement;
  top: number;
  height: number;
  beats: HTMLElement[];
  timings: { at: number; kind: string }[];
}

type Events = { scene: (id: SceneId) => void; progress: (p: number, local: number) => void };

const IMPACT_AT = 0.55;

export class SceneDirector {
  private tracks: Track[] = [];
  private stage: HTMLElement;
  private videos: HTMLVideoElement[];
  private activeSlot = -1;
  private prefetcher = document.createElement('video');
  private broken = new Set<string>();
  private current = -1;
  private lastLocal = 0;
  private handlers: { [K in keyof Events]: Events[K][] } = { scene: [], progress: [] };
  private onResize = debounce(() => { this.measure(); this.loadVideo(true); }, 200);

  constructor(private root: HTMLElement, list: Scene[], private scrollTo: (y: number) => void) {
    this.stage = document.querySelector<HTMLElement>('.stage')!;
    this.videos = [...this.stage.querySelectorAll<HTMLVideoElement>('.stage__video')];
    this.prefetcher.muted = true;
    this.prefetcher.preload = 'auto';
    this.tracks = list.map((scene) => {
      const el = root.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`)!;
      const beats = [...el.querySelectorAll<HTMLElement>('.beat')];
      return { scene, el, top: 0, height: 0, beats, timings: beats.map((b) => ({ at: Number(b.dataset.at), kind: b.dataset.kind ?? '' })) };
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
    for (const v of this.videos) v.removeAttribute('src');
  }

  goTo(id: SceneId): void {
    const t = this.tracks.find((t) => t.scene.id === id);
    if (t) this.scrollTo(t.top + 2);
  }

  /** Chamado a cada quadro pelo loop de scroll. */
  tick(): void {
    const y = scrollY;
    const vh = innerHeight;
    let i = 0;
    for (let k = 0; k < this.tracks.length; k++) if (this.tracks[k].top <= y + 1) i = k;
    const t = this.tracks[i];
    const local = clamp((y - t.top) / Math.max(1, t.height - vh));

    if (i !== this.current) {
      this.current = i;
      this.lastLocal = local;
      // Cenas fora de quadro assumem estado coerente: anteriores completas, posteriores zeradas.
      this.tracks.forEach((other, k) => k !== i && this.applyBeats(other, k < i ? 1 : 0));
      this.loadVideo(false);
      this.prefetchNext();
      this.handlers.scene.forEach((cb) => cb(t.scene.id));
    }

    if (t.scene.id === 'impact' && this.lastLocal < IMPACT_AT && local >= IMPACT_AT) this.shake();
    this.lastLocal = local;

    this.applyCues(cues(t.scene.id, local), this.hasVideo());
    this.applyBeats(t, local);
    this.scrub(local);

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

  private sourceFor(scene: Scene): string | undefined {
    const src = pickSource(scene, { w: innerWidth, h: innerHeight });
    return src && !this.broken.has(src) ? src : undefined;
  }

  private hasVideo(): boolean {
    return this.activeSlot >= 0 && this.videos[this.activeSlot].classList.contains('is-active');
  }

  private loadVideo(force: boolean): void {
    const src = this.sourceFor(this.tracks[this.current].scene);
    const active = this.videos[this.activeSlot];
    if (!src) {
      this.videos.forEach((v) => v.classList.remove('is-active'));
      this.activeSlot = -1;
      return;
    }
    if (!force && active?.getAttribute('src') === src) return;
    const slot = this.activeSlot === 0 ? 1 : 0;
    const next = this.videos[slot];
    next.preload = 'auto';
    next.src = src;
    next.addEventListener('loadeddata', () => {
      if (next.getAttribute('src') !== src) return;
      next.classList.add('is-active');
      this.videos.forEach((v, k) => k !== slot && v.classList.remove('is-active'));
    }, { once: true });
    this.activeSlot = slot;
  }

  private prefetchNext(): void {
    const next = this.tracks[this.current + 1];
    const src = next && this.sourceFor(next.scene);
    if (src && this.prefetcher.getAttribute('src') !== src) this.prefetcher.src = src;
  }

  private markBroken(v: HTMLVideoElement): void {
    const src = v.getAttribute('src');
    if (src) this.broken.add(src);
    v.classList.remove('is-active');
    v.removeAttribute('src');
  }

  private scrub(local: number): void {
    if (!this.hasVideo()) return;
    const v = this.videos[this.activeSlot];
    if (!v.duration || v.seeking) return;
    const target = local * (v.duration - 0.05);
    if (Math.abs(v.currentTime - target) > 1 / 30) v.currentTime = target;
  }

  private applyCues(c: Cues, video: boolean): void {
    const s = this.stage.style;
    s.setProperty('--visor', String(video ? 0 : c.visor));
    s.setProperty('--ignite', c.ignite.toFixed(3));
    s.setProperty('--sensor', String(c.sensor));
    s.setProperty('--visor-scale', c.visorScale.toFixed(3));
    s.setProperty('--warm', c.warm.toFixed(3));
    s.setProperty('--glow', c.glow.toFixed(3));
    s.setProperty('--zoom', c.zoom.toFixed(3));
    this.stage.dataset.rain = c.rain.toFixed(2);
    s.setProperty('--rain', c.rain.toFixed(2));
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

function clamp(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function debounce(fn: () => void, ms: number): () => void {
  let id = 0;
  return () => { clearTimeout(id); id = window.setTimeout(fn, ms); };
}
